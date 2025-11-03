import logging
import re
import json
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
    """Client for executing SQUANDER operations on remote server via SSH"""
    
    def __init__(self, session_id: Optional[str] = None):
        self.ssh_client = None
        self.sftp_client = None
        self.is_connected = False
        self.session_id = session_id
        self.last_used = None
        if session_id:
            try:
                self.last_used = asyncio.get_event_loop().time()
            except RuntimeError:
                pass

    @classmethod
    async def get_pooled_client(cls, session_id: str) -> 'SquanderClient':
        """Get or create a pooled connection for a session"""
        async with _pool_lock:
            if session_id in _connection_pool:
                client = _connection_pool[session_id]
                if client.is_connected:
                    client.last_used = asyncio.get_event_loop().time()
                    logger.info(f"Reusing SSH connection for session {session_id}")
                    return client
                # client exists but not connected, remove it
                del _connection_pool[session_id]
            client = cls(session_id=session_id)
            _connection_pool[session_id] = client
        try:
            await client.connect()
            logger.info(f"Created pooled SSH connection for session {session_id}")
            return client
        except Exception:
            async with _pool_lock:
                if session_id in _connection_pool and _connection_pool[session_id] is client:
                    del _connection_pool[session_id]
            raise

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
            }
            if settings.SSH_KEY_PATH:
                key_path = Path(settings.SSH_KEY_PATH).expanduser()
                connect_kwargs["key_filename"] = str(key_path)
            self.ssh_client.connect(**connect_kwargs)
            self.sftp_client = self.ssh_client.open_sftp()
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

    async def download_file(self, remote_path: str, local_path: str) -> None:
        """Download file from remote server"""
        if not self.is_connected:
            raise SSHConnectionError("Not connected")
        try:
            def _download():
                self.sftp_client.get(remote_path, local_path)
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(_io_pool, _download)
        except Exception as e:
            raise SquanderExecutionError(f"Download failed: {e}") from e

    async def run_partition(
        self,
        job_id: str,
        num_qubits: int,
        placed_gates: list,
        measurements: list,
        options: Dict[str, Any],
        strategy: str = "kahn",
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Execute circuit partitioning on remote SQUANDER server"""
        remote_job_dir = f"/tmp/squander_jobs/{job_id}"
        local_circuit_file = f"/tmp/{job_id}_input.json"
        local_result_file = f"/tmp/{job_id}_output.json"
        
        try:
            yield {"type": "phase", "phase": "preparing", "message": "Preparing job...", "progress": 2}

            # Create remote directory
            await self.execute_command(f"mkdir -p {remote_job_dir}")

            # Prepare circuit data
            yield {"type": "phase", "phase": "uploading", "message": "Uploading circuit...", "progress": 3}
            circuit_data = {
                "num_qubits": num_qubits,
                "placed_gates": placed_gates,
                "measurements": measurements,
                "options": options,
                "strategy": strategy,
            }

            # Write and upload circuit file
            Path(local_circuit_file).write_text(json.dumps(circuit_data, indent=2))
            remote_circuit_file = f"{remote_job_dir}/circuit.json"
            await self.upload_file(local_circuit_file, remote_circuit_file)

            # Upload processing modules
            yield {"type": "phase", "phase": "uploading", "message": "Uploading processing modules...", "progress": 4}
            modules_to_upload = [
                ("convert.py", Path(__file__).parent / "convert.py"),
                ("simulate.py", Path(__file__).parent / "simulate.py"),
            ]
            for module_name, module_path in modules_to_upload:
                if module_path.exists():
                    remote_module = f"{remote_job_dir}/{module_name}"
                    await self.upload_file(str(module_path), remote_module)

            # Execute partition command
            yield {"type": "phase", "phase": "building", "message": "Building and partitioning circuit...", "progress": 5}
            max_partition_size = options.get("max_partition_size", 4)
            partition_cmd = (
                f"cd {remote_job_dir} && "
                f"python3 -u simulate.py circuit.json "
                f"--partition-size {max_partition_size} "
                f"--strategy {strategy} "
                f"--output result.json"
            )

            async for update in self.stream_command_output(partition_cmd):
                yield update

            # Download results
            yield {"type": "phase", "phase": "downloading", "message": "Downloading results..."}
            remote_result_file = f"{remote_job_dir}/result.json"
            await self.download_file(remote_result_file, local_result_file)

            # Parse results
            result_data = json.loads(Path(local_result_file).read_text())

            # Cleanup remote directory (this takes time)
            yield {"type": "phase", "phase": "cleanup", "message": "Cleaning up..."}
            await self.execute_command(f"rm -rf {remote_job_dir}")

            # Cleanup local files
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
            # Ensure cleanup of local files
            Path(local_circuit_file).unlink(missing_ok=True)
            Path(local_result_file).unlink(missing_ok=True)

    async def import_qasm(self, qasm_code: str) -> AsyncGenerator[Dict[str, Any], None]:
        """Import QASM circuit using remote SQUANDER server"""
        import uuid
        job_id = str(uuid.uuid4())
        remote_job_dir = f"/tmp/squander_qasm/{job_id}"
        local_qasm_file = f"/tmp/{job_id}.qasm"
        local_json_file = f"/tmp/{job_id}.json"
        
        try:
            yield {"type": "phase", "phase": "preparing", "message": "Preparing QASM import..."}
            
            # Write QASM file locally
            Path(local_qasm_file).write_text(qasm_code)
            
            # Create remote directory
            await self.execute_command(f"mkdir -p {remote_job_dir}")
            
            # Upload QASM file
            yield {"type": "phase", "phase": "uploading", "message": "Uploading QASM file..."}
            remote_qasm_file = f"{remote_job_dir}/circuit.qasm"
            await self.upload_file(local_qasm_file, remote_qasm_file)
            
            # Upload convert module
            convert_module = Path(__file__).parent / "convert.py"
            if convert_module.exists():
                remote_convert = f"{remote_job_dir}/convert.py"
                await self.upload_file(str(convert_module), remote_convert)
            
            # Convert QASM to JSON
            yield {"type": "phase", "phase": "converting", "message": "Converting QASM to circuit..."}
            remote_json_file = f"{remote_job_dir}/circuit.json"
            convert_cmd = f"cd {remote_job_dir} && python3 -u convert.py circuit.qasm --output circuit.json"
            stdout, stderr, exit_code = await self.execute_command(convert_cmd)
            
            if exit_code != 0:
                raise SquanderExecutionError(f"QASM conversion failed: {stderr}")
            
            # Download results
            yield {"type": "phase", "phase": "downloading", "message": "Downloading results..."}
            await self.download_file(remote_json_file, local_json_file)
            
            # Parse results
            result_data = json.loads(Path(local_json_file).read_text())
            
            # Cleanup remote directory
            yield {"type": "phase", "phase": "cleanup", "message": "Cleaning up..."}
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