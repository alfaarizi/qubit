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
            logger.info(f"SSH connection established to {settings.SQUANDER_HOST}")
        except Exception as e:
            self.is_connected = False
            logger.error(f"SSH connection failed: {str(e)}", exc_info=True)
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
            logger.error(f"Execute error: {str(e)}", exc_info=True)
            raise SquanderExecutionError(f"Command failed: {str(e)}") from e

    async def stream_command_output(
        self, command: str
    ) -> AsyncGenerator[Dict[str, Any], None]:
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
                        line = line.decode("utf-8").strip()
                        if line:
                            progress = self._parse_progress(line)
                            results.append({"type": "log", "message": line, "progress": progress})
                    
                    error_output = stderr.read().decode("utf-8")
                    return_code = stdout.channel.recv_exit_status()
                except Exception as e:
                    logger.error(f"Stream read error: {str(e)}", exc_info=True)
                    raise SquanderExecutionError(f"Stream read error: {str(e)}")
                
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
            logger.error(f"Stream error: {str(e)}", exc_info=True)
            raise SquanderExecutionError(f"Stream failed: {str(e)}") from e

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
        if not self.is_connected:
            raise SSHConnectionError("Not connected")
        try:
            def _upload():
                self.sftp_client.put(local_path, remote_path)
            
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(_thread_pool, _upload)
        except Exception as e:
            raise SquanderExecutionError(f"Upload failed: {str(e)}") from e

    async def download_file(self, remote_path: str, local_path: str) -> None:
        if not self.is_connected:
            raise SSHConnectionError("Not connected")
        try:
            def _download():
                self.sftp_client.get(remote_path, local_path)
            
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(_thread_pool, _download)
        except Exception as e:
            raise SquanderExecutionError(f"Download failed: {str(e)}") from e

    async def run_partition(
        self,
        job_id: str,
        num_qubits: int,
        placed_gates: list,
        measurements: list,
        options: Dict[str, Any],
        strategy: str = "kahn",
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
                "strategy": strategy,
            }
            local_circuit_file = f"/tmp/{job_id}_input.json"
            Path(local_circuit_file).write_text(json.dumps(circuit_data, indent=2))
            remote_circuit_file = f"{remote_job_dir}/circuit.json"
            await self.upload_file(local_circuit_file, remote_circuit_file)

            yield {"type": "phase", "phase": "building", "message": "Building and partitioning circuit..."}
            
            # Build SQUANDER circuit and run partitioning
            max_partition_size = options.get("maxPartitionSize", 4)
            squander_cmd = (
                f"cd {remote_job_dir} && python3 << 'EOF'\n"
                f"import sys\n"
                f"sys.path.insert(0, '{settings.SQUANDER_PATH}')\n"
                f"from squander import Circuit\n"
                f"from squander.partitioning.partition import PartitionCircuit\n"
                f"import json\n"
                f"import numpy as np\n"
                f"\n"
                f"with open('circuit.json') as f:\n"
                f"    data = json.load(f)\n"
                f"\n"
                f"# Build SQUANDER circuit\n"
                f"c = Circuit(data['numQubits'])\n"
                f"parameters = []\n"
                f"\n"
                f"# Add gates to circuit\n"
                f"for gate_info in data['placedGates']:\n"
                f"    gate_id = gate_info['gate']['id'].upper()\n"
                f"    target_qubits = gate_info['targetQubits']\n"
                f"    control_qubits = gate_info['controlQubits']\n"
                f"    gate_params = gate_info.get('parameters', [])\n"
                f"    \n"
                f"    # Single-qubit gates\n"
                f"    if gate_id == 'H':\n"
                f"        c.add_H(target_qubits[0])\n"
                f"    elif gate_id == 'X':\n"
                f"        c.add_X(target_qubits[0])\n"
                f"    elif gate_id == 'Y':\n"
                f"        c.add_Y(target_qubits[0])\n"
                f"    elif gate_id == 'Z':\n"
                f"        c.add_Z(target_qubits[0])\n"
                f"    elif gate_id == 'S':\n"
                f"        c.add_S(target_qubits[0])\n"
                f"    elif gate_id == 'T':\n"
                f"        c.add_T(target_qubits[0])\n"
                f"    elif gate_id == 'RX':\n"
                f"        c.add_RX(target_qubits[0])\n"
                f"        parameters.extend(gate_params if gate_params else [np.pi/2])\n"
                f"    elif gate_id == 'RY':\n"
                f"        c.add_RY(target_qubits[0])\n"
                f"        parameters.extend(gate_params if gate_params else [np.pi/2])\n"
                f"    elif gate_id == 'RZ':\n"
                f"        c.add_RZ(target_qubits[0])\n"
                f"        parameters.extend(gate_params if gate_params else [np.pi/2])\n"
                f"    elif gate_id == 'SX':\n"
                f"        c.add_SX(target_qubits[0])\n"
                f"    # Two-qubit gates\n"
                f"    elif gate_id in ['CNOT', 'CX']:\n"
                f"        c.add_CNOT(target_qubits[0], control_qubits[0])\n"
                f"    elif gate_id == 'CZ':\n"
                f"        c.add_CZ(target_qubits[0], control_qubits[0])\n"
                f"    elif gate_id == 'CH':\n"
                f"        c.add_CH(target_qubits[0], control_qubits[0])\n"
                f"    elif gate_id == 'SWAP':\n"
                f"        c.add_SWAP(target_qubits)\n"
                f"    # Multi-qubit gates\n"
                f"    elif gate_id in ['CCX', 'TOFFOLI']:\n"
                f"        c.add_CCX(target_qubits[0], control_qubits)\n"
                f"\n"
                f"parameters = np.array(parameters, dtype=np.float64)\n"
                f"\n"
                f"# Run partitioning\n"
                f"strategy = data.get('strategy', 'kahn')\n"
                f"max_size = {max_partition_size}\n"
                f"partitioned_circ, partitioned_params, partition_assignments = PartitionCircuit(\n"
                f"    c, parameters, max_size, strategy\n"
                f")\n"
                f"\n"
                f"# Collect results\n"
                f"partitions = []\n"
                f"for i, partition in enumerate(partitioned_circ.get_Gates()):\n"
                f"    gates = partition.get_Gates()\n"
                f"    qubits = set()\n"
                f"    for gate in gates:\n"
                f"        qubits.update(gate.get_Involved_Qbits())\n"
                f"    partitions.append({{\n"
                f"        'index': i,\n"
                f"        'numGates': len(gates),\n"
                f"        'qubits': sorted(list(qubits)),\n"
                f"        'numQubits': len(qubits)\n"
                f"    }})\n"
                f"\n"
                f"result = {{\n"
                f"    'strategy': strategy,\n"
                f"    'maxPartitionSize': max_size,\n"
                f"    'totalPartitions': len(partitions),\n"
                f"    'totalGates': len(data['placedGates']),\n"
                f"    'partitions': partitions\n"
                f"}}\n"
                f"\n"
                f"with open('result.json', 'w') as f:\n"
                f"    json.dump(result, f)\n"
                f"print('Partitioning complete!')\n"
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
