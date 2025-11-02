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
                        raise SSHConnectionError("SSH key not found at {}".format(key_path))

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
            raise SSHConnectionError("SSH connection failed: {}".format(str(e))) from e

    async def disconnect(self) -> None:
        try:
            if self.sftp_client:
                self.sftp_client.close()
            if self.ssh_client:
                self.ssh_client.close()
            self.is_connected = False
        except Exception as e:
            logger.error("Disconnect error: %s", str(e))

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
            logger.error("Execute error: %s", str(e), exc_info=True)
            raise SquanderExecutionError("Command failed: {}".format(str(e))) from e

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
                        # Handle both bytes and str (paramiko can return either)
                        if isinstance(line, bytes):
                            line = line.decode("utf-8").strip()
                        else:
                            line = line.strip()
                        
                        if line:
                            progress = self._parse_progress(line)
                            results.append({"type": "log", "message": line, "progress": progress})
                    # Handle stderr output
                    stderr_data = stderr.read()
                    if isinstance(stderr_data, bytes):
                        error_output = stderr_data.decode("utf-8")
                    else:
                        error_output = stderr_data
                    
                    return_code = stdout.channel.recv_exit_status()
                except Exception as e:
                    logger.error("Stream read error: %s", str(e), exc_info=True)
                    raise SquanderExecutionError("Stream read error: {}".format(str(e)))
                
                return results, error_output, return_code
            
            loop = asyncio.get_event_loop()
            results, error_output, return_code = await loop.run_in_executor(_thread_pool, _stream_worker)
            
            for result in results:
                yield result

            if return_code != 0:
                raise SquanderExecutionError("Command failed: {}".format(error_output))

            if error_output:
                yield {"type": "log", "message": "[WARNING] {}".format(error_output)}
        except SquanderExecutionError:
            raise
        except Exception as e:
            logger.error("Stream error: %s", str(e), exc_info=True)
            raise SquanderExecutionError("Stream failed: {}".format(str(e))) from e

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
            raise SquanderExecutionError("Upload failed: {}".format(str(e))) from e

    async def download_file(self, remote_path: str, local_path: str) -> None:
        if not self.is_connected:
            raise SSHConnectionError("Not connected")
        try:
            def _download():
                self.sftp_client.get(remote_path, local_path)
            
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(_thread_pool, _download)
        except Exception as e:
            raise SquanderExecutionError("Download failed: {}".format(str(e))) from e

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
            remote_job_dir = "/tmp/squander_jobs/{}".format(job_id)
            yield {"type": "phase", "phase": "preparing", "message": "Preparing job..."}
            await self.execute_command("mkdir -p {}".format(remote_job_dir))

            yield {"type": "phase", "phase": "uploading", "message": "Uploading circuit..."}
            circuit_data = {
                "numQubits": num_qubits,
                "placedGates": placed_gates,
                "measurements": measurements,
                "options": options,
                "strategy": strategy,
            }
            local_circuit_file = "/tmp/{}_input.json".format(job_id)
            Path(local_circuit_file).write_text(json.dumps(circuit_data, indent=2))
            remote_circuit_file = "{}/circuit.json".format(remote_job_dir)
            await self.upload_file(local_circuit_file, remote_circuit_file)

            yield {"type": "phase", "phase": "building", "message": "Building and partitioning circuit..."}
            
            max_partition_size = options.get("maxPartitionSize", 4)
            
            python_script = """
import sys
sys.path.insert(0, '{squander_path}')
from squander import Circuit
from squander.partitioning.partition import PartitionCircuit
import json
import numpy as np

def build_circuit(circuit_data, start_qubit=0):
    \"\"\"Recursively build SQUANDER circuit including nested circuits\"\"\"
    c = Circuit(circuit_data['numQubits'])
    parameters = []
    
    for gate_info in circuit_data['placedGates']:
        # Handle nested circuits - flatten them instead of using add_Circuit
        if 'circuit' in gate_info:
            # Recursively process nested circuit gates with offset
            nested_start_qubit = gate_info.get('startQubit', 0) + start_qubit
            nested_circuit_data = {{
                'numQubits': circuit_data['numQubits'],  # Use parent circuit's qubit count
                'placedGates': gate_info['circuit']['gates']
            }}
            # Recursively build and extract gates from nested circuit
            nested_circuit, nested_params = build_circuit(nested_circuit_data, nested_start_qubit)
            
            # Extract gates from nested circuit and add them individually
            nested_gates = nested_circuit.get_Gates()
            for nested_gate in nested_gates:
                c.add_Gate(nested_gate)
            
            parameters.extend(nested_params)
            continue
        
        gate_id = gate_info['gate']['id'].upper()
        target_qubits = [q + start_qubit for q in gate_info['targetQubits']]
        control_qubits = [q + start_qubit for q in gate_info['controlQubits']]
        gate_params = gate_info.get('parameters', [])
        
        if gate_id == 'H':
            c.add_H(target_qubits[0])
        elif gate_id == 'X':
            c.add_X(target_qubits[0])
        elif gate_id == 'Y':
            c.add_Y(target_qubits[0])
        elif gate_id == 'Z':
            c.add_Z(target_qubits[0])
        elif gate_id == 'S':
            c.add_S(target_qubits[0])
        elif gate_id == 'T':
            c.add_T(target_qubits[0])
        elif gate_id == 'SDG':
            c.add_Sdg(target_qubits[0])
        elif gate_id == 'TDG':
            c.add_Tdg(target_qubits[0])
        elif gate_id == 'RX':
            c.add_RX(target_qubits[0])
            parameters.extend(gate_params if gate_params else [np.pi/2])
        elif gate_id == 'RY':
            c.add_RY(target_qubits[0])
            parameters.extend(gate_params if gate_params else [np.pi/2])
        elif gate_id == 'RZ':
            c.add_RZ(target_qubits[0])
            parameters.extend(gate_params if gate_params else [np.pi/2])
        elif gate_id == 'R':
            c.add_R(target_qubits[0])
            parameters.extend(gate_params if gate_params else [np.pi])
        elif gate_id == 'SX':
            c.add_SX(target_qubits[0])
        elif gate_id == 'U1':
            c.add_U1(target_qubits[0])
            parameters.extend(gate_params if gate_params else [0])
        elif gate_id == 'U2':
            c.add_U2(target_qubits[0])
            parameters.extend(gate_params if gate_params else [0, 0])
        elif gate_id == 'U3':
            c.add_U3(target_qubits[0])
            parameters.extend(gate_params if gate_params else [0, 0, 0])
        elif gate_id in ['CNOT', 'CX']:
            c.add_CNOT(target_qubits[0], control_qubits[0])
        elif gate_id == 'CZ':
            c.add_CZ(target_qubits[0], control_qubits[0])
        elif gate_id == 'CH':
            c.add_CH(target_qubits[0], control_qubits[0])
        elif gate_id == 'CRY':
            c.add_CRY(target_qubits[0], control_qubits[0])
            parameters.extend(gate_params if gate_params else [np.pi/2])
        elif gate_id == 'CRZ':
            c.add_CRZ(target_qubits[0], control_qubits[0])
            parameters.extend(gate_params if gate_params else [np.pi/2])
        elif gate_id == 'CRX':
            c.add_CRX(target_qubits[0], control_qubits[0])
            parameters.extend(gate_params if gate_params else [np.pi/2])
        elif gate_id == 'CP':
            c.add_CP(target_qubits[0], control_qubits[0])
            parameters.extend(gate_params if gate_params else [0])
        elif gate_id == 'CR':
            c.add_CR(target_qubits[0], control_qubits[0])
            parameters.extend(gate_params if gate_params else [np.pi])
        elif gate_id == 'CROT':
            c.add_CROT(target_qubits[0], control_qubits[0])
            parameters.extend(gate_params if gate_params else [0, 0, 0])
        elif gate_id == 'SYC':
            c.add_SYC(target_qubits[0], control_qubits[0])
        elif gate_id == 'SWAP':
            c.add_SWAP(target_qubits)
        elif gate_id == 'CSWAP':
            c.add_CSWAP(target_qubits, control_qubits)
        elif gate_id in ['CCX', 'TOFFOLI']:
            c.add_CCX(target_qubits[0], control_qubits)
    
    return c, parameters

with open('circuit.json') as f:
    data = json.load(f)

c, parameters = build_circuit(data)
parameters = np.array(parameters, dtype=np.float64)

strategy = data.get('strategy', 'kahn')
max_size = {max_size}
partitioned_circ, partitioned_params, partition_assignments = PartitionCircuit(
    c, parameters, max_size, strategy
)

partitions = []
for i, partition in enumerate(partitioned_circ.get_Gates()):
    gates = partition.get_Gates()
    qubits = set()
    gate_details = []
    
    for gate in gates:
        qubits.update(gate.get_Involved_Qbits())
        gate_name = gate.get_Name()
        target_qbit = gate.get_Target_Qbit()
        control_qbit = gate.get_Control_Qbit()
        
        gate_details.append({{
            'id': gate_name.lower(),
            'name': gate_name,
            'targetQubits': [target_qbit] if target_qbit >= 0 else [],
            'controlQubits': [control_qbit] if control_qbit >= 0 else []
        }})
    
    partitions.append({{
        'index': i,
        'numGates': len(gates),
        'qubits': sorted(list(qubits)),
        'numQubits': len(qubits),
        'gates': gate_details
    }})

result = {{
    'strategy': strategy,
    'maxPartitionSize': max_size,
    'totalPartitions': len(partitions),
    'totalGates': len(data['placedGates']),
    'partitions': partitions
}}

with open('result.json', 'w') as f:
    json.dump(result, f)
print('Partitioning complete!')
""".format(squander_path=settings.SQUANDER_PATH, max_size=max_partition_size)

            squander_cmd = "cd {} && python3 << 'EOF'\n{}EOF".format(remote_job_dir, python_script)
            async for update in self.stream_command_output(squander_cmd):
                yield update

            yield {"type": "phase", "phase": "downloading", "message": "Downloading results..."}
            remote_result_file = "{}/result.json".format(remote_job_dir)
            local_result_file = "/tmp/{}_output.json".format(job_id)
            await self.download_file(remote_result_file, local_result_file)

            result_data = json.loads(Path(local_result_file).read_text())

            yield {"type": "phase", "phase": "cleanup", "message": "Cleaning up..."}
            await self.execute_command("rm -rf {}".format(remote_job_dir))
            Path(local_circuit_file).unlink(missing_ok=True)
            Path(local_result_file).unlink(missing_ok=True)

            yield {"type": "complete", "message": "Partition completed successfully", "result": result_data}

        except SquanderExecutionError as e:
            logger.error("Execution error: %s", str(e))
            yield {"type": "error", "message": str(e)}
        except Exception as e:
            logger.error("Partition error: %s", str(e))
            yield {"type": "error", "message": str(e)}
