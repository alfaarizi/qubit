import asyncio
import json
import logging
import re
import tempfile
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, AsyncGenerator, Dict, Optional

import paramiko

from app.core.config import settings
from app.services.squander_detector import is_squander_available

logger = logging.getLogger(__name__)

# Thread pools for SSH and IO operations
_ssh_pool = ThreadPoolExecutor(max_workers=5, thread_name_prefix="ssh")
_io_pool = ThreadPoolExecutor(max_workers=10, thread_name_prefix="io")
_connection_pool: Dict[str, "SquanderClient"] = {}
_pool_lock = asyncio.Lock()
_semaphore = asyncio.Semaphore(5)

class SquanderExecutionError(Exception):
    """Raised when SQUANDER command execution fails."""


class SSHConnectionError(Exception):
    """Raised when SSH connection fails."""

class SquanderClient:
    """Client for executing SQUANDER operations locally or remotely via SSH."""

    def __init__(self, session_id: Optional[str] = None):
        self.ssh_client: Optional[paramiko.SSHClient] = None
        self.sftp_client: Optional[paramiko.SFTPClient] = None
        self.is_connected: bool = False
        self.session_id: Optional[str] = session_id
        self.last_used: Optional[float] = None
        self.use_local: bool = is_squander_available()

        if session_id:
            try:
                self.last_used = asyncio.get_event_loop().time()
            except RuntimeError:
                pass

    @classmethod
    async def create(cls, session_id: Optional[str] = None) -> "SquanderClient":
        """Factory method: creates local or remote client based on SQUANDER availability."""
        if session_id:
            return await cls.get_pooled_client(session_id)

        client = cls(session_id=None)

        if client.use_local:
            client.is_connected = True
        else:
            await client.connect()

        return client

    @classmethod
    async def get_pooled_client(cls, session_id: str) -> "SquanderClient":
        """Get or create a pooled connection for a session."""
        async with _pool_lock:
            if session_id in _connection_pool:
                client = _connection_pool[session_id]
                if client.is_connected:
                    client.last_used = asyncio.get_event_loop().time()
                    return client
                # Not connected, evict and recreate
                del _connection_pool[session_id]

            client = cls(session_id=session_id)
            _connection_pool[session_id] = client

        if client.use_local:
            client.is_connected = True
        else:
            try:
                await client.connect()
            except Exception:
                async with _pool_lock:
                    if session_id in _connection_pool and _connection_pool[session_id] is client:
                        del _connection_pool[session_id]
                raise

        return client

    @classmethod
    async def cleanup_stale_connections(cls, max_idle_seconds: int = 300) -> None:
        """Clean up connections idle for more than max_idle_seconds."""
        async with _pool_lock:
            current_time = asyncio.get_running_loop().time()
            stale_sessions = [
                sid
                for sid, client in _connection_pool.items()
                if client.last_used and (current_time - client.last_used) > max_idle_seconds
            ]

        for session_id in stale_sessions:
            async with _pool_lock:
                client = _connection_pool.pop(session_id, None)

            if client:
                try:
                    await client.disconnect()
                except Exception as e:
                    logger.warning(f"Error disconnecting stale session {session_id}: {e}")

    async def connect(self) -> None:
        """Establish SSH connection and SFTP session."""
        if self.is_connected:
            return

        async with _semaphore:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(_ssh_pool, self._connect_blocking)
            if self.session_id:
                self.last_used = loop.time()

    def _connect_blocking(self) -> None:
        """Blocking SSH connection (runs in thread pool)."""
        try:
            self.ssh_client = paramiko.SSHClient()
            self.ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

            connect_kwargs: Dict[str, Any] = {
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

            # Configure keepalive to prevent connection drops
            transport = self.ssh_client.get_transport()
            if transport:
                transport.set_keepalive(30)

            self.sftp_client = self.ssh_client.open_sftp()
            self.sftp_client.get_channel().settimeout(120)
            self.is_connected = True

        except Exception as e:
            if self.ssh_client:
                try:
                    self.ssh_client.close()
                except Exception:
                    pass
            raise SSHConnectionError(f"Failed to connect to SQUANDER server: {e}")

    async def disconnect(self) -> None:
        """Close SSH and SFTP connections."""
        if not self.is_connected:
            return

        def _disconnect() -> None:
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

    async def execute_command(self, command: str) -> tuple[str, str, int]:
        """Execute command on remote server and return (stdout, stderr, exit_code)."""
        if not self.is_connected:
            raise SSHConnectionError("Not connected")

        def _execute() -> tuple[str, str, int]:
            stdin, stdout, stderr = self.ssh_client.exec_command(
                command, timeout=settings.SQUANDER_EXEC_TIMEOUT
            )
            output = stdout.read().decode("utf-8")
            error = stderr.read().decode("utf-8")
            return_code = stdout.channel.recv_exit_status()
            return output, error, return_code

        try:
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(_io_pool, _execute)
        except Exception as e:
            logger.error("Execute error: %s", str(e), exc_info=True)
            raise SquanderExecutionError(f"Command failed: {e}") from e

    async def stream_command_output(self, command: str) -> AsyncGenerator[Dict[str, Any], None]:
        """Execute command and stream output line by line."""
        if not self.is_connected:
            raise SSHConnectionError("Not connected")

        output_queue: asyncio.Queue[Dict[str, Any]] = asyncio.Queue(maxsize=100)
        loop = asyncio.get_running_loop()

        def _stream_worker() -> None:
            """Worker function that runs in thread pool."""

            def _queue_put(item: Dict[str, Any]) -> None:
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
                                for line in text.splitlines():
                                    stripped = line.strip()
                                    if stripped:
                                        _queue_put({
                                            "type": "log",
                                            "message": stripped,
                                            "progress": self._parse_progress(stripped),
                                        })
                        except Exception as e:
                            logger.warning(f"Error receiving data: {e}")

                # Signal completion
                _queue_put({
                    "_done": True,
                    "exit_code": channel.recv_exit_status(),
                    "stderr": stderr.read().decode("utf-8", errors="replace").strip(),
                })

            except Exception as e:
                logger.error(f"Stream worker error: {e}", exc_info=True)
                try:
                    asyncio.run_coroutine_threadsafe(
                        output_queue.put({"_error": str(e)}), loop
                    ).result(timeout=1.0)
                except Exception:
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
                        raise SquanderExecutionError(
                            f"Command failed with exit code {item['exit_code']}: {item['stderr']}"
                        )
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
        """Extract progress percentage from output line."""
        percent_match = re.search(r"\[?(\d+)%\]?", line)
        if percent_match:
            return int(percent_match.group(1))

        count_match = re.search(r"(\d+)/(\d+)", line)
        if count_match:
            current, total = int(count_match.group(1)), int(count_match.group(2))
            if total > 0:
                return int((current / total) * 100)

        return None

    async def upload_file(self, local_path: str, remote_path: str) -> None:
        """Upload file to remote server."""
        if not self.is_connected:
            raise SSHConnectionError("Not connected")

        def _upload() -> None:
            self.sftp_client.put(local_path, remote_path)

        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(_io_pool, _upload)
        except Exception as e:
            raise SquanderExecutionError(f"Upload failed: {e}") from e

    async def download_file(self, remote_path: str, local_path: str, max_retries: int = 3) -> None:
        """Download file from remote server with retry logic."""
        if not self.is_connected:
            raise SSHConnectionError("Not connected")

        last_error: Optional[Exception] = None

        for attempt in range(max_retries):
            try:
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(
                    _io_pool, lambda: self.sftp_client.get(remote_path, local_path)
                )
                return
            except Exception as e:
                last_error = e
                retryable_errors = ["garbage", "reset", "pipe", "timeout", "eof"]
                is_retryable = any(err in str(e).lower() for err in retryable_errors)

                if is_retryable and attempt < max_retries - 1:
                    logger.warning(f"Download attempt {attempt + 1} failed: {e}, retrying...")
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
        """Execute partition locally using SQUANDER."""
        circuit_file: Optional[str] = None

        try:
            yield {
                "type": "phase",
                "phase": "preparing",
                "message": "Preparing partition job locally...",
                "progress": 2,
            }

            circuit_data = {
                "num_qubits": num_qubits,
                "placed_gates": placed_gates,
                "measurements": measurements,
                "options": options,
                "strategy": strategy,
            }

            with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
                json.dump(circuit_data, f, indent=2)
                circuit_file = f.name

            yield {
                "type": "phase",
                "phase": "building",
                "message": "Partitioning circuit...",
                "progress": 5,
            }

            from app.services.simulate import run_simulation

            max_partition_size = options.get("max_partition_size", 4)
            simulation_timeout = options.get("simulation_timeout")
            compute_density_matrix = options.get("compute_density_matrix", False)
            compute_entropy = options.get("compute_entropy", False)

            yield {
                "type": "phase",
                "phase": "simulating",
                "message": "Simulating circuit...",
                "progress": 10,
            }

            result_data = await asyncio.to_thread(
                run_simulation,
                circuit_data,
                max_partition_size,
                strategy,
                10000,
                None,  # progress_callback
                simulation_timeout,
                compute_density_matrix,
                compute_entropy,
            )

            if circuit_name:
                result_data["circuit_name"] = circuit_name

            yield {
                "type": "phase", 
                "phase": "finalizing", 
                "message": "Finalizing results...",
                "progress": 95,
            }

            yield {
                "type": "complete",
                "message": "Partition completed successfully",
                "result": result_data,
            }

        except Exception as e:
            logger.error(f"Local partition error: {e}", exc_info=True)
            yield {"type": "error", "message": str(e)}

        finally:
            if circuit_file:
                Path(circuit_file).unlink(missing_ok=True)

    async def _import_qasm_local(
        self,
        qasm_code: str,
        options: Optional[Dict[str, Any]] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Import QASM locally using SQUANDER."""
        qasm_file: Optional[str] = None
        json_file: Optional[str] = None

        try:
            yield {
                "type": "phase",
                "phase": "preparing",
                "message": "Preparing QASM import locally...",
                "progress": 10,
            }

            with tempfile.NamedTemporaryFile(mode="w", suffix=".qasm", delete=False) as f:
                f.write(qasm_code)
                qasm_file = f.name

            yield {
                "type": "phase",
                "phase": "converting",
                "message": "Converting QASM to circuit...",
                "progress": 50,
            }

            from app.services.convert import CircuitConverter

            with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
                json_file = f.name

            await asyncio.to_thread(CircuitConverter.qasm_to_json, qasm_file, json_file)
            result_data = json.loads(Path(json_file).read_text())

            yield {
                "type": "complete",
                "message": "QASM import completed successfully",
                "result": result_data,
            }

        except Exception as e:
            logger.error(f"Local QASM import error: {e}", exc_info=True)
            yield {"type": "error", "message": str(e)}

        finally:
            if qasm_file:
                Path(qasm_file).unlink(missing_ok=True)
            if json_file:
                Path(json_file).unlink(missing_ok=True)

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
        """Execute circuit partitioning locally or on remote SQUANDER server."""

        if self.use_local:
            async for update in self._run_partition_local(
                job_id, num_qubits, placed_gates, measurements, options, strategy, circuit_name
            ):
                yield update
            return

        # Remote execution
        remote_job_dir = f"/tmp/squander_jobs/{job_id}"
        local_circuit_file = f"/tmp/{job_id}_input.json"
        local_result_file = f"/tmp/{job_id}_output.json"

        try:
            yield {
                "type": "phase",
                "phase": "preparing",
                "message": "Preparing partition job...",
                "progress": 2,
            }

            await self.execute_command(f"mkdir -p {remote_job_dir}")

            yield {
                "type": "phase",
                "phase": "uploading",
                "message": "Uploading circuit...",
                "progress": 3,
            }

            circuit_data = {
                "num_qubits": num_qubits,
                "placed_gates": placed_gates,
                "measurements": measurements,
                "options": options,
                "strategy": strategy,
            }

            Path(local_circuit_file).write_text(json.dumps(circuit_data, indent=2))
            await self.upload_file(local_circuit_file, f"{remote_job_dir}/circuit.json")

            yield {
                "type": "phase",
                "phase": "uploading",
                "message": "Uploading processing modules...",
                "progress": 4,
            }

            modules_to_upload = ["convert.py", "simulate.py"]
            for module_name in modules_to_upload:
                module_path = Path(__file__).parent / module_name
                if module_path.exists():
                    await self.upload_file(str(module_path), f"{remote_job_dir}/{module_name}")

            yield {
                "type": "phase",
                "phase": "building",
                "message": "Partitioning circuit...",
                "progress": 5,
            }

            # Build partition command
            max_partition_size = options.get("max_partition_size", 4)
            simulation_timeout = options.get("simulation_timeout")
            compute_density_matrix = options.get("compute_density_matrix", False)
            compute_entropy = options.get("compute_entropy", False)

            partition_cmd = (
                f"cd {remote_job_dir} && "
                f"python3 -u simulate.py circuit.json "
                f"--partition-size {max_partition_size} "
                f"--strategy {strategy} "
                f"--output result.json"
            )

            if simulation_timeout and simulation_timeout > 0:
                partition_cmd += f" --timeout {simulation_timeout}"
            if not compute_density_matrix:
                partition_cmd += " --skip-density-matrix"
            if not compute_entropy:
                partition_cmd += " --skip-entropy"

            yield {
                "type": "phase",
                "phase": "simulating",
                "message": "Simulating circuit...",
                "progress": 10,
            }

            async for update in self.stream_command_output(partition_cmd):
                yield update

            yield {
                "type": "phase", 
                "phase": "downloading", 
                "message": "Downloading results...",
                "progress": 95,
            }

            await self.download_file(f"{remote_job_dir}/result.json", local_result_file)

            result_data = json.loads(Path(local_result_file).read_text())
            if circuit_name:
                result_data["circuit_name"] = circuit_name

            yield {
                "type": "phase", 
                "phase": "cleanup", 
                "message": "Cleaning up..."
            }

            await self.execute_command(f"rm -rf {remote_job_dir}")

            yield {
                "type": "complete",
                "message": "Partition completed successfully",
                "result": result_data,
            }

        except SquanderExecutionError as e:
            logger.error("Execution error: %s", str(e))
            yield {"type": "error", "message": str(e)}

        except Exception as e:
            logger.error("Partition error: %s", str(e), exc_info=True)
            yield {"type": "error", "message": str(e)}

        finally:
            Path(local_circuit_file).unlink(missing_ok=True)
            Path(local_result_file).unlink(missing_ok=True)

    async def import_qasm(
        self, qasm_code: str, options: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Import QASM circuit locally or using remote SQUANDER server."""

        if self.use_local:
            async for update in self._import_qasm_local(qasm_code, options):
                yield update
            return

        # Remote execution
        options = options or {}
        job_id = str(uuid.uuid4())
        remote_job_dir = f"/tmp/squander_qasm/{job_id}"
        local_qasm_file = f"/tmp/{job_id}.qasm"
        local_json_file = f"/tmp/{job_id}.json"
        simulation_timeout = options.get("simulation_timeout")

        try:
            yield {
                "type": "phase",
                "phase": "preparing",
                "message": "Preparing QASM import...",
                "progress": 10,
            }

            Path(local_qasm_file).write_text(qasm_code)
            await self.execute_command(f"mkdir -p {remote_job_dir}")

            yield {
                "type": "phase",
                "phase": "uploading",
                "message": "Uploading QASM file...",
                "progress": 30,
            }

            await self.upload_file(local_qasm_file, f"{remote_job_dir}/circuit.qasm")

            convert_module = Path(__file__).parent / "convert.py"
            if convert_module.exists():
                await self.upload_file(str(convert_module), f"{remote_job_dir}/convert.py")

            yield {
                "type": "phase",
                "phase": "converting",
                "message": "Converting QASM to circuit...",
                "progress": 50,
            }

            convert_cmd = f"cd {remote_job_dir} && python3 -u convert.py circuit.qasm --output circuit.json"
            if simulation_timeout and simulation_timeout > 0:
                convert_cmd = f"timeout {simulation_timeout} bash -c '{convert_cmd}'"

            stdout, stderr, exit_code = await self.execute_command(convert_cmd)

            if exit_code == 124:
                raise SquanderExecutionError(
                    f"QASM conversion timed out after {simulation_timeout} seconds"
                )
            if exit_code != 0:
                raise SquanderExecutionError(f"QASM conversion failed: {stderr}")

            yield {
                "type": "phase",
                "phase": "downloading",
                "message": "Downloading results...",
                "progress": 80,
            }

            await self.download_file(f"{remote_job_dir}/circuit.json", local_json_file)
            result_data = json.loads(Path(local_json_file).read_text())

            yield {
                "type": "phase",
                "phase": "cleanup",
                "message": "Cleaning up...",
                "progress": 95,
            }

            if self.session_id:
                try:
                    await self.execute_command(f"rm -rf {remote_job_dir}")
                except Exception as cleanup_error:
                    logger.warning(f"Failed to cleanup remote directory: {cleanup_error}")

            yield {
                "type": "complete",
                "message": "QASM import completed successfully",
                "result": result_data,
            }

        except SquanderExecutionError as e:
            logger.error("QASM import error: %s", str(e))
            yield {"type": "error", "message": str(e)}

        except Exception as e:
            logger.error("QASM import error: %s", str(e), exc_info=True)
            yield {"type": "error", "message": str(e)}

        finally:
            Path(local_qasm_file).unlink(missing_ok=True)
            Path(local_json_file).unlink(missing_ok=True)