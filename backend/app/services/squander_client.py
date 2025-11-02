import logging
import re
import json
from typing import AsyncGenerator, Dict, Any, Optional
from pathlib import Path
import paramiko

from app.core.config import settings

logger = logging.getLogger(__name__)


class SquanderExecutionError(Exception):
    pass


class SSHConnectionError(Exception):
    pass


class SquanderClient:
    def __init__(self):
        self.ssh_client = None
        self.sftp_client = None
        self.is_connected = False

    async def connect(self) -> None:
        try:
            self.ssh_client = paramiko.SSHClient()
            self.ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            key_path = Path(settings.SSH_KEY_PATH).expanduser()
            if not key_path.exists():
                raise SSHConnectionError(f"SSH key not found at {key_path}")

            self.ssh_client.connect(
                hostname=settings.SQUANDER_HOST,
                username=settings.SQUANDER_USER,
                key_filename=str(key_path),
                timeout=settings.SSH_TIMEOUT,
                look_for_keys=False,
                allow_agent=False,
            )
            
            self.sftp_client = self.ssh_client.open_sftp()
            self.is_connected = True
        except Exception as e:
            self.is_connected = False
            raise SSHConnectionError(f"SSH connection failed: {str(e)}") from e

    async def disconnect(self) -> None:
        try:
            if self.sftp_client:
                self.sftp_client.close()
            if self.ssh_client:
                self.ssh_client.close()
            self.is_connected = False
        except Exception as e:
            logger.error(f"Disconnect error: {str(e)}")

    async def execute_command(self, command: str) -> tuple[str, str, int]:
        if not self.is_connected:
            raise SSHConnectionError("Not connected")
        try:
            stdin, stdout, stderr = self.ssh_client.exec_command(
                command, timeout=settings.SQUANDER_EXEC_TIMEOUT
            )
            output = stdout.read().decode("utf-8")
            error = stderr.read().decode("utf-8")
            return_code = stdout.channel.recv_exit_status()
            return output, error, return_code
        except Exception as e:
            raise SquanderExecutionError(f"Command failed: {str(e)}") from e

    async def stream_command_output(
        self, command: str
    ) -> AsyncGenerator[Dict[str, Any], None]:
        if not self.is_connected:
            raise SSHConnectionError("Not connected")
        try:
            stdin, stdout, stderr = self.ssh_client.exec_command(
                command, timeout=settings.SQUANDER_EXEC_TIMEOUT
            )

            for line in stdout:
                line = line.decode("utf-8").strip()
                if line:
                    progress = self._parse_progress(line)
                    yield {"type": "log", "message": line, "progress": progress}

            error_output = stderr.read().decode("utf-8")
            return_code = stdout.channel.recv_exit_status()

            if return_code != 0:
                raise SquanderExecutionError(f"Command failed: {error_output}")

            if error_output:
                yield {"type": "log", "message": f"[WARNING] {error_output}"}
        except SquanderExecutionError:
            raise
        except Exception as e:
            raise SquanderExecutionError(f"Stream failed: {str(e)}") from e

    @staticmethod
    def _parse_progress(line: str) -> Optional[int]:
        """Extract progress percentage from output line"""
        # Try percentage format: [50%] or Progress: 50%
        percent_match = re.search(r"\[?(\d+)%\]?", line)
        if percent_match:
            return int(percent_match.group(1))

        # Try count format: 10/20
        count_match = re.search(r"(\d+)/(\d+)", line)
        if count_match:
            current = int(count_match.group(1))
            total = int(count_match.group(2))
            return int((current / total) * 100) if total > 0 else None

        return None

    async def upload_file(self, local_path: str, remote_path: str) -> None:
        if not self.is_connected:
            raise SSHConnectionError("Not connected")
        try:
            self.sftp_client.put(local_path, remote_path)
        except Exception as e:
            raise SquanderExecutionError(f"Upload failed: {str(e)}") from e

    async def download_file(self, remote_path: str, local_path: str) -> None:
        if not self.is_connected:
            raise SSHConnectionError("Not connected")
        try:
            self.sftp_client.get(remote_path, local_path)
        except Exception as e:
            raise SquanderExecutionError(f"Download failed: {str(e)}") from e

    async def run_partition(
        self,
        job_id: str,
        num_qubits: int,
        placed_gates: list,
        measurements: list,
        options: Dict[str, Any],
    ) -> AsyncGenerator[Dict[str, Any], None]:
        try:
            remote_job_dir = f"/tmp/squander_jobs/{job_id}"
            yield {"type": "phase", "phase": "preparing", "message": "Preparing job..."}
            await self.execute_command(f"mkdir -p {remote_job_dir}")

            yield {"type": "phase", "phase": "uploading", "message": "Uploading circuit..."}
            circuit_data = {
                "numQubits": num_qubits,
                "placedGates": placed_gates,
                "measurements": measurements,
                "options": options,
            }
            local_circuit_file = f"/tmp/{job_id}_input.json"
            Path(local_circuit_file).write_text(json.dumps(circuit_data, indent=2))
            remote_circuit_file = f"{remote_job_dir}/circuit.json"
            await self.upload_file(local_circuit_file, remote_circuit_file)

            yield {"type": "phase", "phase": "building", "message": "Building and partitioning circuit..."}
            squander_cmd = (
                f"cd {remote_job_dir} && python3 << 'EOF'\n"
                f"import sys\n"
                f"sys.path.insert(0, '{settings.SQUANDER_PATH}')\n"
                f"from squander import *\n"
                f"import json\n"
                f"with open('circuit.json') as f:\n"
                f"    circuit_data = json.load(f)\n"
                f"result = {{}}\n"
                f"with open('result.json', 'w') as f:\n"
                f"    json.dump(result, f)\n"
                f"EOF"
            )
            async for update in self.stream_command_output(squander_cmd):
                yield update

            yield {"type": "phase", "phase": "downloading", "message": "Downloading results..."}
            remote_result_file = f"{remote_job_dir}/result.json"
            local_result_file = f"/tmp/{job_id}_output.json"
            await self.download_file(remote_result_file, local_result_file)

            result_data = json.loads(Path(local_result_file).read_text())

            yield {"type": "phase", "phase": "cleanup", "message": "Cleaning up..."}
            await self.execute_command(f"rm -rf {remote_job_dir}")
            Path(local_circuit_file).unlink(missing_ok=True)
            Path(local_result_file).unlink(missing_ok=True)

            yield {"type": "complete", "message": "Partition completed successfully", "result": result_data}

        except SquanderExecutionError as e:
            logger.error(f"Execution error: {str(e)}")
            yield {"type": "error", "message": str(e)}
        except Exception as e:
            logger.error(f"Partition error: {str(e)}")
            yield {"type": "error", "message": str(e)}
