import logging
import re
import json
from typing import AsyncGenerator, Dict, Any, Optional
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from threading import Semaphore
import asyncio
import paramiko
from app.core.config import settings

logger = logging.getLogger(__name__)
_thread_pool = ThreadPoolExecutor(max_workers=10)
_ssh_semaphore = Semaphore(3)

class SquanderExecutionError(Exception):
    """Raised when SQUANDER command execution fails"""
    pass

class SSHConnectionError(Exception):
    """Raised when SSH connection fails"""
    pass

class SquanderClient:
    """Client for executing SQUANDER operations on remote server via SSH"""
    
    def __init__(self):
        self.ssh_client = None
        self.sftp_client = None
        self.is_connected = False

    async def connect(self) -> None:
        """Establish SSH connection to SQUANDER server"""
        try:
            def _connect():
                _ssh_semaphore.acquire()
                try:
                    client = paramiko.SSHClient()
                    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                    key_path = Path(settings.SSH_KEY_PATH).expanduser()
                    if not key_path.exists():
                        raise SSHConnectionError(f"SSH key not found at {key_path}")
                    client.connect(
                        hostname=settings.SQUANDER_HOST,
                        username=settings.SQUANDER_USER,
                        key_filename=str(key_path),
                        timeout=settings.SSH_TIMEOUT,
                        look_for_keys=False,
                        allow_agent=False,
                    )
                    sftp = client.open_sftp()
                    return client, sftp
                finally:
                    _ssh_semaphore.release()
            loop = asyncio.get_event_loop()
            self.ssh_client, self.sftp_client = await loop.run_in_executor(_thread_pool, _connect)
            self.is_connected = True
            logger.info("SSH connection established to %s", settings.SQUANDER_HOST)
        except Exception as e:
            self.is_connected = False
            logger.error("SSH connection failed: %s", str(e), exc_info=True)
            raise SSHConnectionError(f"SSH connection failed: {e}") from e

    async def disconnect(self) -> None:
        """Close SSH connection"""
        try:
            if self.sftp_client:
                self.sftp_client.close()
            if self.ssh_client:
                self.ssh_client.close()
            self.is_connected = False
        except Exception as e:
            logger.error("Disconnect error: %s", str(e))

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
            output, error, return_code = await loop.run_in_executor(_thread_pool, _execute)
            return output, error, return_code
        except Exception as e:
            logger.error("Execute error: %s", str(e), exc_info=True)
            raise SquanderExecutionError(f"Command failed: {e}") from e

    async def stream_command_output(self, command: str) -> AsyncGenerator[Dict[str, Any], None]:
        """Execute command and stream output line by line"""
        if not self.is_connected:
            raise SSHConnectionError("Not connected")
        try:
            def _stream_worker():
                stdin, stdout, stderr = self.ssh_client.exec_command(
                    command, timeout=settings.SQUANDER_EXEC_TIMEOUT
                )
                results = []
                error_output = ""
                return_code = 0
                try:
                    for line in stdout:
                        line = line.decode("utf-8").strip() if isinstance(line, bytes) else line.strip()
                        if line:
                            progress = self._parse_progress(line)
                            results.append({"type": "log", "message": line, "progress": progress})
                    stderr_data = stderr.read()
                    error_output = stderr_data.decode("utf-8") if isinstance(stderr_data, bytes) else stderr_data
                    return_code = stdout.channel.recv_exit_status()
                except Exception as e:
                    logger.error("Stream read error: %s", str(e), exc_info=True)
                    raise SquanderExecutionError(f"Stream read error: {e}")
                return results, error_output, return_code
            loop = asyncio.get_event_loop()
            results, error_output, return_code = await loop.run_in_executor(_thread_pool, _stream_worker)
            for result in results:
                yield result
            if return_code != 0:
                raise SquanderExecutionError(f"Command failed: {error_output}")
            if error_output:
                yield {"type": "log", "message": f"[WARNING] {error_output}"}
        except SquanderExecutionError:
            raise
        except Exception as e:
            logger.error("Stream error: %s", str(e), exc_info=True)
            raise SquanderExecutionError(f"Stream failed: {e}") from e

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
            await loop.run_in_executor(_thread_pool, _upload)
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
            await loop.run_in_executor(_thread_pool, _download)
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
        try:
            remote_job_dir = f"/tmp/squander_jobs/{job_id}"
            # Prepare job directory
            yield {"type": "phase", "phase": "preparing", "message": "Preparing job..."}
            await self.execute_command(f"mkdir -p {remote_job_dir}")
            # Upload circuit data
            yield {"type": "phase", "phase": "uploading", "message": "Uploading circuit..."}
            circuit_data = {
                "num_qubits": num_qubits,
                "placed_gates": placed_gates,
                "measurements": measurements,
                "options": options,
                "strategy": strategy,
            }
            local_circuit_file = f"/tmp/{job_id}_input.json"
            Path(local_circuit_file).write_text(json.dumps(circuit_data, indent=2))
            remote_circuit_file = f"{remote_job_dir}/circuit.json"
            await self.upload_file(local_circuit_file, remote_circuit_file)
            # Upload helper modules
            yield {"type": "phase", "phase": "uploading", "message": "Uploading processing modules..."}
            modules_to_upload = [
                ("convert.py", Path(__file__).parent / "convert.py"),
                ("simulate.py", Path(__file__).parent / "simulate.py"),
            ]
            for module_name, module_path in modules_to_upload:
                if module_path.exists():
                    remote_module = f"{remote_job_dir}/{module_name}"
                    await self.upload_file(str(module_path), remote_module)
            # Execute partitioning
            yield {"type": "phase", "phase": "building", "message": "Building and partitioning circuit..."}
            max_partition_size = options.get("maxPartitionSize", 4)
            partition_cmd = f"cd {remote_job_dir} && python3 simulate.py circuit.json --partition-size {max_partition_size} --strategy {strategy} --output result.json"
            async for update in self.stream_command_output(partition_cmd):
                yield update
            # Download results
            yield {"type": "phase", "phase": "downloading", "message": "Downloading results..."}
            remote_result_file = f"{remote_job_dir}/result.json"
            local_result_file = f"/tmp/{job_id}_output.json"
            await self.download_file(remote_result_file, local_result_file)
            result_data = json.loads(Path(local_result_file).read_text())
            # Cleanup
            yield {"type": "phase", "phase": "cleanup", "message": "Cleaning up..."}
            await self.execute_command(f"rm -rf {remote_job_dir}")
            Path(local_circuit_file).unlink(missing_ok=True)
            Path(local_result_file).unlink(missing_ok=True)
            yield {"type": "complete", "message": "Partition completed successfully", "result": result_data}
        except SquanderExecutionError as e:
            logger.error("Execution error: %s", str(e))
            yield {"type": "error", "message": str(e)}
        except Exception as e:
            logger.error("Partition error: %s", str(e))
            yield {"type": "error", "message": str(e)}
