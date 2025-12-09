import logging
import re
import json
import tempfile
from typing import AsyncGenerator, Dict, Any, Optional
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import asyncio
import paramiko
from app.core.config import settings

logger = logging.getLogger(__name__)

# Separate thread pools for different operations
_ssh_pool = ThreadPoolExecutor(max_workers=5, thread_name_prefix="ssh")
_io_pool = ThreadPoolExecutor(max_workers=10, thread_name_prefix="io")
_connection_pool: Dict[str, 'SquanderClient'] = {}
_pool_lock = asyncio.Lock()

# Use asyncio.Semaphore instead of threading.Semaphore
_semaphore = asyncio.Semaphore(5)

class SquanderExecutionError(Exception):
    """Raised when SQUANDER command execution fails"""
    pass

class SSHConnectionError(Exception):
    """Raised when SSH connection fails"""
    pass

class SquanderClient:
    """Client for executing SQUANDER operations locally or remotely via SSH"""

    def __init__(self, session_id: Optional[str] = None, use_local: bool = False):
        self.ssh_client = None
        self.sftp_client = None
        self.is_connected = False
        self.session_id = session_id
        self.last_used = None
        self.use_local = use_local
        if session_id:
            try:
                self.last_used = asyncio.get_event_loop().time()
            except RuntimeError:
                pass

    @classmethod
    async def create(cls, session_id: Optional[str] = None) -> 'SquanderClient':
        """factory method: creates local or remote client based on SQUANDER availability."""
        from app.services.squander_detector import is_squander_available
        use_local = is_squander_available()
        logger.info(f"SquanderClient.create called: session_id={session_id}, use_local={use_local}")
        if session_id:
            return await cls.get_pooled_client(session_id, use_local=use_local)
        else:
            logger.info(f"using {'local' if use_local else 'remote'} SQUANDER execution")
            client = cls(session_id=None, use_local=use_local)
            if not use_local:
                await client.connect()
            else:
                client.is_connected = True
            return client

    @classmethod
    async def get_pooled_client(cls, session_id: str, use_local: bool = False) -> 'SquanderClient':
        """get or create a pooled connection for a session"""
        logger.info(f"get_pooled_client called: session_id={session_id}, use_local={use_local}")
        async with _pool_lock:
            if session_id in _connection_pool:
                client = _connection_pool[session_id]
                logger.info(f"found pooled client: client.use_local={client.use_local}, client.is_connected={client.is_connected}")
                # check if client's use_local matches current mode
                if client.use_local == use_local and client.is_connected:
                    client.last_used = asyncio.get_event_loop().time()
                    logger.info(f"reusing {'local' if use_local else 'SSH'} connection for session {session_id}")
                    return client
                # mode mismatch or not connected, remove old client
                logger.info(f"mode mismatch or not connected, evicting pooled client")
                del _connection_pool[session_id]
            client = cls(session_id=session_id, use_local=use_local)
            _connection_pool[session_id] = client
        if not use_local:
            try:
                await client.connect()
                logger.info(f"created pooled SSH connection for session {session_id}")
                return client
            except Exception:
                async with _pool_lock:
                    if session_id in _connection_pool and _connection_pool[session_id] is client:
                        del _connection_pool[session_id]
                raise
        else:
            client.is_connected = True
            logger.info(f"created pooled local client for session {session_id}")
            return client

    @classmethod
    async def cleanup_stale_connections(cls, max_idle_seconds: int = 300) -> None:
        """Clean up connections idle for more than max_idle_seconds"""
        async with _pool_lock:
            loop = asyncio.get_running_loop()
            current_time = loop.time()
            stale_sessions = [
                sid for sid, client in _connection_pool.items()
                if client.last_used and (current_time - client.last_used) > max_idle_seconds
            ]
        for session_id in stale_sessions:
            async with _pool_lock:
                client = _connection_pool[session_id]
                if client:
                    del _connection_pool[session_id]
            if client:
                try:
                    await client.disconnect()
                    logger.info(f"Cleaned up stale SSH connection for session {session_id}")
                except Exception as e:
                    logger.warning(f"Error disconnecting stale session {session_id}: {e}")

    async def connect(self) -> None:
        """Establish SSH connection and SFTP session"""
        if self.is_connected:
            return
        async with _semaphore:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(_ssh_pool, self._connect_blocking)
            if self.session_id:
                self.last_used = loop.time()
            logger.info(f"SSH connection established {'from the pool' if self.session_id else 'for the first time'}")

    def _connect_blocking(self) -> None:
        """Blocking SSH connection (runs in thread pool)"""
        try:
            self.ssh_client = paramiko.SSHClient()
            self.ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            connect_kwargs = {
                "hostname": settings.SQUANDER_SSH_HOST,
                "username": settings.SQUANDER_SSH_USER,
                "timeout": 30,
                "banner_timeout": 30,
                "auth_timeout": 30,
            }
            if settings.SSH_KEY_PATH:
                key_path = Path(settings.SSH_KEY_PATH).expanduser()
                connect_kwargs["key_filename"] = str(key_path)
            self.ssh_client.connect(**connect_kwargs)

            # configure keepalive to prevent connection drops
            transport = self.ssh_client.get_transport()
            if transport:
                transport.set_keepalive(30)  # Send keepalive every 30 seconds

            self.sftp_client = self.ssh_client.open_sftp()
            # set SFTP channel timeout
            self.sftp_client.get_channel().settimeout(120)  # 2 minute timeout for SFTP operations
            self.is_connected = True
        except Exception as e:
            if self.ssh_client:
                try:
                    self.ssh_client.close()
                except:
                    pass
            raise SSHConnectionError(f"Failed to connect to SQUANDER server: {str(e)}")

    async def disconnect(self) -> None:
        """Close SSH and SFTP connections"""
        if not self.is_connected:
            return
        def _disconnect():
            if self.sftp_client:
                try:
                    self.sftp_client.close()
                except Exception as e:
                    logger.warning(f"Error closing SFTP: {e}")
            if self.ssh_client:
                try:
                    self.ssh_client.close()
                except Exception as e:
                    logger.warning(f"Error closing SSH: {e}")
        
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(_ssh_pool, _disconnect)
        
        self.sftp_client = None
        self.ssh_client = None
        self.is_connected = False
        logger.info("SSH connection closed")

    async def execute_command(self, command: str) -> tuple[str, str, int]:
        """Execute command on remote server and return output"""
        if not self.is_connected:
            raise SSHConnectionError("Not connected")
        try:
            def _execute():
                stdin, stdout, stderr = self.ssh_client.exec_command(
                    command, timeout=settings.SQUANDER_EXEC_TIMEOUT
                )
                output = stdout.read().decode("utf-8")
                error = stderr.read().decode("utf-8")
                return_code = stdout.channel.recv_exit_status()
                return output, error, return_code
            
            loop = asyncio.get_event_loop()
            output, error, return_code = await loop.run_in_executor(_io_pool, _execute)
            return output, error, return_code
        except Exception as e:
            logger.error("Execute error: %s", str(e), exc_info=True)
            raise SquanderExecutionError(f"Command failed: {e}") from e

    async def stream_command_output(self, command: str) -> AsyncGenerator[Dict[str, Any], None]:
        """Execute command and stream output line by line"""
        if not self.is_connected:
            raise SSHConnectionError("Not connected")

        output_queue: asyncio.Queue = asyncio.Queue(maxsize=100)
        loop = asyncio.get_running_loop()

        def _stream_worker():
            """Worker function that runs in thread pool"""
            def _queue_put(item):
                asyncio.run_coroutine_threadsafe(output_queue.put(item), loop).result(timeout=5.0)

            try:
                stdin, stdout, stderr = self.ssh_client.exec_command(
                    command, timeout=settings.SQUANDER_EXEC_TIMEOUT, get_pty=True
                )
                channel = stdout.channel
                channel.settimeout(0.1)

                # Stream output line by line
                while not channel.exit_status_ready() or channel.recv_ready():
                    if channel.recv_ready():
                        try:
                            chunk = channel.recv(1024)
                            if chunk:
                                text = chunk.decode("utf-8", errors="replace")
                                for line in (l.strip() for l in text.splitlines() if l.strip()):
                                    _queue_put({"type": "log", "message": line, "progress": self._parse_progress(line)})
                        except Exception as e:
                            logger.warning(f"Error receiving data: {e}")

                # Signal completion
                _queue_put({"_done": True, "exit_code": channel.recv_exit_status(), "stderr": stderr.read().decode("utf-8", errors="replace").strip()})
            except Exception as e:
                logger.error(f"Stream worker error: {e}", exc_info=True)
                try:
                    asyncio.run_coroutine_threadsafe(output_queue.put({"_error": str(e)}), loop).result(timeout=1.0)
                except:
                    pass

        # Start worker and consume queue
        worker_task = loop.run_in_executor(_io_pool, _stream_worker)
        try:
            while True:
                try:
                    item = await asyncio.wait_for(output_queue.get(), timeout=0.5)
                except asyncio.TimeoutError:
                    if worker_task.done():
                        # Drain remaining items
                        while not output_queue.empty():
                            try:
                                item = output_queue.get_nowait()
                                if "_done" in item or "_error" in item:
                                    break
                                yield item
                            except asyncio.QueueEmpty:
                                break
                        break
                    continue

                if "_done" in item:
                    if item["exit_code"] != 0:
                        raise SquanderExecutionError(f"Command failed with exit code {item['exit_code']}: {item['stderr']}")
                    if item["stderr"]:
                        yield {"type": "log", "message": f"[WARNING] {item['stderr']}"}
                    break
                elif "_error" in item:
                    raise SquanderExecutionError(f"Stream error: {item['_error']}")
                else:
                    yield item
        finally:
            try:
                await asyncio.wait_for(worker_task, timeout=5.0)
            except asyncio.TimeoutError:
                logger.warning("Stream worker did not complete in time")

    @staticmethod
    def _parse_progress(line: str) -> Optional[int]:
        """Extract progress percentage from output line"""
        percent_match = re.search(r"\[?(\d+)%\]?", line)
        if percent_match:
            return int(percent_match.group(1))
        count_match = re.search(r"(\d+)/(\d+)", line)
        if count_match:
            current = int(count_match.group(1))
            total = int(count_match.group(2))
            return int((current / total) * 100) if total > 0 else None
        return None

    async def upload_file(self, local_path: str, remote_path: str) -> None:
        """Upload file to remote server"""
        if not self.is_connected:
            raise SSHConnectionError("Not connected")
        try:
            def _upload():
                self.sftp_client.put(local_path, remote_path)
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(_io_pool, _upload)
        except Exception as e:
            raise SquanderExecutionError(f"Upload failed: {e}") from e

    async def download_file(self, remote_path: str, local_path: str, max_retries: int = 3) -> None:
        """download file from remote server with retry logic"""
        if not self.is_connected:
            raise SSHConnectionError("Not connected")
        last_error = None
        for attempt in range(max_retries):
            try:
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(_io_pool, lambda: self.sftp_client.get(remote_path, local_path))
                return
            except Exception as e:
                last_error = e
                retryable = any(x in str(e).lower() for x in ["garbage", "reset", "pipe", "timeout", "eof"])
                if retryable and attempt < max_retries - 1:
                    logger.warning(f"download attempt {attempt + 1} failed: {e}, retrying...")
                    await asyncio.sleep(attempt + 1)
                    try:
                        self.sftp_client = self.ssh_client.open_sftp()
                        self.sftp_client.get_channel().settimeout(120)
                    except Exception:
                        pass
                else:
                    break
        raise SquanderExecutionError(f"Download failed: {last_error}") from last_error

    async def _run_partition_local(
        self,
        job_id: str,
        num_qubits: int,
        placed_gates: list,
        measurements: list,
        options: Dict[str, Any],
        strategy: str = "kahn",
        circuit_name: Optional[str] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """execute partition locally using SQUANDER."""
        try:
            yield {"type": "phase", "phase": "preparing", "message": "Preparing local execution...", "progress": 2}
            circuit_data = {
                "num_qubits": num_qubits,
                "placed_gates": placed_gates,
                "measurements": measurements,
                "options": options,
                "strategy": strategy,
            }
            with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
                json.dump(circuit_data, f, indent=2)
                circuit_file = f.name
            try:
                yield {"type": "phase", "phase": "building", "message": "Processing locally...", "progress": 5}
                from app.services.simulate import run_simulation
                max_partition_size = options.get("max_partition_size", 4)
                simulation_timeout = options.get("simulation_timeout")
                compute_density_matrix = options.get("compute_density_matrix", False)
                compute_entropy = options.get("compute_entropy", False)
                result_data = await asyncio.to_thread(
                    run_simulation, circuit_file, max_partition_size, strategy, 10000,
                    simulation_timeout, not compute_density_matrix, not compute_entropy
                )
                if circuit_name:
                    result_data["circuit_name"] = circuit_name
                yield {"type": "complete", "message": "Partition completed successfully", "result": result_data}
            finally:
                Path(circuit_file).unlink(missing_ok=True)
        except Exception as e:
            logger.error(f"local partition error: {e}", exc_info=True)
            yield {"type": "error", "message": str(e)}

    async def _import_qasm_local(
        self,
        qasm_code: str,
        options: Dict[str, Any] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """import QASM locally using SQUANDER."""
        try:
            yield {"type": "phase", "phase": "preparing", "message": "Preparing local import...", "progress": 10}
            with tempfile.NamedTemporaryFile(mode='w', suffix='.qasm', delete=False) as f:
                f.write(qasm_code)
                qasm_file = f.name
            try:
                yield {"type": "phase", "phase": "converting", "message": "Converting QASM locally...", "progress": 50}
                from app.services.convert import CircuitConverter
                with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
                    json_file = f.name
                await asyncio.to_thread(CircuitConverter.qasm_to_json, qasm_file, json_file)
                result_data = json.loads(Path(json_file).read_text())
                Path(json_file).unlink(missing_ok=True)
                yield {"type": "complete", "message": "QASM import completed successfully", "result": result_data}
            finally:
                Path(qasm_file).unlink(missing_ok=True)
        except Exception as e:
            logger.error(f"local QASM import error: {e}", exc_info=True)
            yield {"type": "error", "message": str(e)}

    async def run_partition(
        self,
        job_id: str,
        num_qubits: int,
        placed_gates: list,
        measurements: list,
        options: Dict[str, Any],
        strategy: str = "kahn",
        circuit_name: Optional[str] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Execute circuit partitioning locally or on remote SQUANDER server"""
        logger.info(f"run_partition: job_id={job_id}, use_local={self.use_local}, session_id={self.session_id}")
        if self.use_local:
            async for update in self._run_partition_local(
                job_id, num_qubits, placed_gates, measurements, options, strategy, circuit_name
            ):
                yield update
            return

        remote_job_dir = f"/tmp/squander_jobs/{job_id}"
        local_circuit_file = f"/tmp/{job_id}_input.json"
        local_result_file = f"/tmp/{job_id}_output.json"
        try:
            yield {"type": "phase", "phase": "preparing", "message": "Preparing job...", "progress": 2}
            # create remote directory
            await self.execute_command(f"mkdir -p {remote_job_dir}")
            # prepare circuit data
            yield {"type": "phase", "phase": "uploading", "message": "Uploading circuit...", "progress": 3}
            circuit_data = {
                "num_qubits": num_qubits,
                "placed_gates": placed_gates,
                "measurements": measurements,
                "options": options,
                "strategy": strategy,
            }

            # write and upload circuit file
            Path(local_circuit_file).write_text(json.dumps(circuit_data, indent=2))
            remote_circuit_file = f"{remote_job_dir}/circuit.json"
            await self.upload_file(local_circuit_file, remote_circuit_file)
            # upload processing modules
            yield {"type": "phase", "phase": "uploading", "message": "Uploading processing modules...", "progress": 4}
            modules_to_upload = [
                ("convert.py", Path(__file__).parent / "convert.py"),
                ("simulate.py", Path(__file__).parent / "simulate.py"),
            ]
            for module_name, module_path in modules_to_upload:
                if module_path.exists():
                    remote_module = f"{remote_job_dir}/{module_name}"
                    await self.upload_file(str(module_path), remote_module)
            
            # execute partition command
            yield {"type": "phase", "phase": "building", "message": "Building and partitioning circuit...", "progress": 5}
            max_partition_size = options.get("max_partition_size", 4)
            simulation_timeout = options.get("simulation_timeout")
            compute_density_matrix = options.get("compute_density_matrix", False)
            compute_entropy = options.get("compute_entropy", False)
            logger.info(f"[run_partition] Received simulation_timeout: {simulation_timeout} (type: {type(simulation_timeout)})")
            partition_cmd = (
                f"cd {remote_job_dir} && "
                f"python3 -u simulate.py circuit.json "
                f"--partition-size {max_partition_size} "
                f"--strategy {strategy} "
                f"--output result.json"
            )
            # add timeout parameter if provided
            if simulation_timeout and simulation_timeout > 0:
                partition_cmd += f" --timeout {simulation_timeout}"
                logger.info(f"[run_partition] Command with timeout: {partition_cmd}")
            # add simulation options
            if not compute_density_matrix:
                partition_cmd += " --skip-density-matrix"
            if not compute_entropy:
                partition_cmd += " --skip-entropy"
            async for update in self.stream_command_output(partition_cmd):
                yield update
            
            # download results
            yield {"type": "phase", "phase": "downloading", "message": "Downloading results..."}
            remote_result_file = f"{remote_job_dir}/result.json"
            await self.download_file(remote_result_file, local_result_file)
            
            # parse results
            result_data = json.loads(Path(local_result_file).read_text())
            # add circuit name to results
            if circuit_name:
                result_data["circuit_name"] = circuit_name
            
            # cleanup remote directory
            yield {"type": "phase", "phase": "cleanup", "message": "Cleaning up..."}
            await self.execute_command(f"rm -rf {remote_job_dir}")
            # cleanup local files
            Path(local_circuit_file).unlink(missing_ok=True)
            Path(local_result_file).unlink(missing_ok=True)
            
            yield {
                "type": "complete",
                "message": "Partition completed successfully",
                "result": result_data
            }
        except SquanderExecutionError as e:
            logger.error("Execution error: %s", str(e))
            yield {"type": "error", "message": str(e)}
        except Exception as e:
            logger.error("Partition error: %s", str(e), exc_info=True)
            yield {"type": "error", "message": str(e)}
        finally:
            # ensure cleanup of local files
            Path(local_circuit_file).unlink(missing_ok=True)
            Path(local_result_file).unlink(missing_ok=True)

    async def import_qasm(self, qasm_code: str, options: Dict[str, Any] = None) -> AsyncGenerator[Dict[str, Any], None]:
        """Import QASM circuit locally or using remote SQUANDER server"""
        logger.info(f"import_qasm: use_local={self.use_local}, session_id={self.session_id}")
        if self.use_local:
            async for update in self._import_qasm_local(qasm_code, options):
                yield update
            return

        import uuid
        job_id = str(uuid.uuid4())
        remote_job_dir = f"/tmp/squander_qasm/{job_id}"
        local_qasm_file = f"/tmp/{job_id}.qasm"
        local_json_file = f"/tmp/{job_id}.json"
        if options is None:
            options = {}
        simulation_timeout = options.get("simulation_timeout")
        try:
            yield {"type": "phase", "phase": "preparing", "message": "Preparing QASM import...", "progress": 10}
            # write QASM file locally
            Path(local_qasm_file).write_text(qasm_code)
            # create remote directory
            await self.execute_command(f"mkdir -p {remote_job_dir}")
            # upload QASM file
            yield {"type": "phase", "phase": "uploading", "message": "Uploading QASM file...", "progress": 30}
            remote_qasm_file = f"{remote_job_dir}/circuit.qasm"
            await self.upload_file(local_qasm_file, remote_qasm_file)
            # upload convert module
            convert_module = Path(__file__).parent / "convert.py"
            if convert_module.exists():
                remote_convert = f"{remote_job_dir}/convert.py"
                await self.upload_file(str(convert_module), remote_convert)
            
            # convert QASM to JSON
            yield {"type": "phase", "phase": "converting", "message": "Converting QASM to circuit...", "progress": 50}
            remote_json_file = f"{remote_job_dir}/circuit.json"
            convert_cmd = f"cd {remote_job_dir} && python3 -u convert.py circuit.qasm --output circuit.json"
            # add timeout to command if specified
            if simulation_timeout and simulation_timeout > 0:
                convert_cmd = f"timeout {simulation_timeout} bash -c '{convert_cmd}'"
            stdout, stderr, exit_code = await self.execute_command(convert_cmd)
            if exit_code == 124:
                raise SquanderExecutionError(f"QASM conversion timed out after {simulation_timeout} seconds")
            elif exit_code != 0:
                raise SquanderExecutionError(f"QASM conversion failed: {stderr}")
            
            # download results
            yield {"type": "phase", "phase": "downloading", "message": "Downloading results...", "progress": 80}
            await self.download_file(remote_json_file, local_json_file)
            # parse results
            result_data = json.loads(Path(local_json_file).read_text())
            
            # cleanup remote directory
            yield {"type": "phase", "phase": "cleanup", "message": "Cleaning up...", "progress": 95}
            if self.session_id:
                try:
                    await self.execute_command(f"rm -rf {remote_job_dir}")
                except Exception as cleanup_error:
                    logger.warning(f"Failed to cleanup remote directory: {cleanup_error}")
            
            yield {
                "type": "complete",
                "message": "QASM import completed successfully",
                "result": result_data
            }            
        except SquanderExecutionError as e:
            logger.error("QASM import error: %s", str(e))
            yield {"type": "error", "message": str(e)}
        except Exception as e:
            logger.error("QASM import error: %s", str(e), exc_info=True)
            yield {"type": "error", "message": str(e)}
        finally:
            # Cleanup local files
            Path(local_qasm_file).unlink(missing_ok=True)
            Path(local_json_file).unlink(missing_ok=True)