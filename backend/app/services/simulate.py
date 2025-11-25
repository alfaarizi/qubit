#!/usr/bin/env python3
"""
SQUANDER Quantum Circuit Simulation Module

This module provides core simulation functions for quantum circuits using SQUANDER.
Designed to be executed on SQUANDER server and return JSON-serializable results.

Usage:
    python3 simulate.py <circuit.json> [--output results.json] [--partition-size 4]

Copyright 2024 SQUANDER
Licensed under Apache License 2.0
"""
import json
import argparse
import time
import os
import tempfile
import numpy as np
import multiprocessing
from typing import Dict, List, Optional, Callable, Any

from squander import Circuit
from squander.partitioning.partition import PartitionCircuit
from convert import CircuitConverter

class TimeoutError(Exception):
    """Raised when a step times out"""
    pass

def run_with_timeout(func, args=(), kwargs=None, timeout_seconds=None):
    """Run a function with a timeout using multiprocessing (works with C/C++)"""
    if kwargs is None:
        kwargs = {}
    if timeout_seconds is None or timeout_seconds <= 0:
        return func(*args, **kwargs)
    result_queue = multiprocessing.Queue()
    def wrapper():
        try:
            result = func(*args, **kwargs)
            result_queue.put(('success', result))
        except Exception as e:
            result_queue.put(('error', e))
    process = multiprocessing.Process(target=wrapper)
    process.start()
    process.join(timeout=timeout_seconds)
    if process.is_alive():
        process.terminate()
        process.join(timeout=1)
        if process.is_alive():
            process.kill()
        raise TimeoutError(f"Operation timed out after {timeout_seconds} seconds")
    if not result_queue.empty():
        status, result = result_queue.get()
        if status == 'error':
            raise result
        return result
    else:
        raise TimeoutError(f"Process ended without returning a result")

class QuantumCircuitSimulator:    
    def __init__(self, num_qubits: int):
        self.num_qubits = num_qubits
        self.circuit = None
        self.parameters = None
        self.matrix_size = 1 << num_qubits
        self.gate_ids = []

    def partition_circuit(self, circuit: Circuit, parameters: np.ndarray, max_partition_size: int = 4, strategy: str = 'kahn', qasm_file: str = None) -> Dict:
        """
        Partition a circuit using the specified strategy.

        For qiskit/bqskit strategies, qasm_file must be provided.
        For other strategies, circuit and parameters are used directly.
        """
        qasm_strategies = ["qiskit", "qiskit-fusion", "bqskit-Quick", "bqskit-Scan", "bqskit-Greedy", "bqskit-Cluster"]

        if strategy in qasm_strategies and not qasm_file:
            raise ValueError(f"Strategy '{strategy}' requires a QASM file, but none was provided")

        partitioned_circ, partitioned_params, partition_assignments = PartitionCircuit(
            circuit, parameters, max_partition_size, strategy, qasm_file
        )

        partitions = []
        for i, partition in enumerate(partitioned_circ.get_Gates()):
            gates = partition.get_Gates()
            qubits = set()
            gate_details = []
            
            original_gate_indices = partition_assignments[i]

            for j, gate in enumerate(gates):
                qubits.update(gate.get_Involved_Qbits())
                gate_name = gate.get_Name()
                target_qbit = gate.get_Target_Qbit()
                control_qbit = gate.get_Control_Qbit()
                
                original_idx = original_gate_indices[j]
                gate_id = self.gate_ids[original_idx] if original_idx < len(self.gate_ids) else None
                
                gate_details.append({
                    'id': gate_id,
                    'name': gate_name,
                    'target_qubits': [target_qbit] if target_qbit >= 0 else [],
                    'control_qubits': [control_qbit] if control_qbit >= 0 else [],
                    'original_index': original_idx
                })
            partitions.append({
                'index': i,
                'num_gates': len(gates),
                'qubits': sorted(list(qubits)),
                'num_qubits': len(qubits),
                'gates': gate_details,
                'original_gate_indices': original_gate_indices
            })
        return {
            'partitioned_circuit': partitioned_circ,
            'partitioned_params': partitioned_params,
            'partition_info': {
                'strategy': strategy,
                'max_partition_size': max_partition_size,
                'total_partitions': len(partitions),
                'partitions': partitions
            }
        }
    
    def simulate_statevector(self, circuit: Circuit, parameters: np.ndarray) -> np.ndarray:
        """Simulate circuit and return state vector"""
        initial_state = np.zeros((self.matrix_size, 1), dtype=np.complex128)
        initial_state[0] = 1.0 + 0j
        state_vector = initial_state.copy()
        params_real = np.array(parameters, dtype=np.float64)
        circuit.apply_to(params_real, state_vector)
        return state_vector
    
    def get_probabilities(self, state_vector: np.ndarray) -> np.ndarray:
        """calculate measurement probabilities from state vector"""
        return np.abs(state_vector.flatten())**2
    
    def get_density_matrix(self, state_vector: np.ndarray) -> np.ndarray:
        """calculate density matrix from state vector"""
        psi = state_vector.flatten()
        return np.outer(psi, psi.conj())
    
    def calculate_entropy(self, circuit: Circuit, parameters: np.ndarray, qubit_subset: List[int]) -> float:
        """Calculate Second Rényi entropy for qubit subset"""
        try:
            initial_state = np.zeros((self.matrix_size, 1), dtype=np.complex128)
            initial_state[0] = 1.0 + 0j
            entropy = circuit.get_Second_Renyi_Entropy(
                parameters=parameters,
                input_state=initial_state,
                qubit_list=qubit_subset
            )
            return entropy
        except Exception as e:
            return 0.0
    
    def calculate_fidelity(self, state1: np.ndarray, state2: np.ndarray) -> float:
        """calculate fidelity between two state vectors"""
        return float(np.abs(np.vdot(state1.flatten(), state2.flatten()))**2)
    
    def sample_measurements(self, state_vector: np.ndarray, num_shots: int = 1000) -> Dict[str, int]:
        """simulate measurements by sampling from probability distribution"""
        probabilities = self.get_probabilities(state_vector)
        samples = np.random.choice(self.matrix_size, size=num_shots, p=probabilities)
        counts = {}
        for sample in samples:
            binary = format(sample, f'0{self.num_qubits}b')
            counts[binary] = counts.get(binary, 0) + 1
        return counts
    
    def get_unitary_matrix(self, circuit: Circuit, parameters: np.ndarray) -> np.ndarray:
        """get unitary matrix representation of circuit"""
        try:
            return circuit.get_Matrix(parameters)
        except:
            return None
    
    def analyze_entanglement_scaling(self, circuit: Circuit, parameters: np.ndarray) -> List[Dict]:
        """Calculate entropy for different subsystem sizes"""
        entropy_data = []
        for size in range(1, self.num_qubits):
            qubit_subset = list(range(size))
            try:
                entropy = self.calculate_entropy(circuit, parameters, qubit_subset)
                entropy_data.append({
                    'subsystem_size': size,
                    'qubits': qubit_subset,
                    'entropy': float(entropy)
                })
            except Exception as e:
                entropy_data.append({
                    'subsystem_size': size,
                    'qubits': qubit_subset,
                    'entropy': None,
                    'error': str(e)
                })
        return entropy_data

def serialize_complex_array(arr: np.ndarray) -> List:
    """convert complex numpy array to JSON-serializable format as [[real, imag], ...]"""
    if np.iscomplexobj(arr):
        return [[float(x.real), float(x.imag)] for x in arr.flatten()]
    return arr.tolist()

def serialize_results(results: Dict) -> Dict:
    """convert numpy arrays to JSON-serializable format"""
    serialized = {}
    for key, value in results.items():
        if isinstance(value, np.ndarray):
            if np.iscomplexobj(value):
                serialized[key] = serialize_complex_array(value)
            else:
                serialized[key] = value.tolist()
        elif isinstance(value, (np.int64, np.int32)):
            serialized[key] = int(value)
        elif isinstance(value, (np.float64, np.float32)):
            serialized[key] = float(value)
        elif isinstance(value, dict):
            serialized[key] = serialize_results(value)
        elif isinstance(value, list):
            serialized[key] = [serialize_results(item) if isinstance(item, dict) else item for item in value]
        else:
            serialized[key] = value
    return serialized

def run_simulation(
    circuit_data: Dict,
    max_partition_size: int = 4,
    strategy: str = 'kahn',
    num_shots: int = 10000,
    progress_callback: Optional[Callable[[str, int, int, str], None]] = None,
    simulation_timeout: Optional[int] = None,
    compute_density_matrix: bool = False,
    compute_entropy: bool = False
) -> Dict:
    """
        run complete simulation pipeline and return all visualization data
        
        Args:
            circuit_data: Circuit data in JSON format
            max_partition_size: Maximum size for circuit partitions
            strategy: Partitioning strategy ('kahn', 'depth', etc.)
            num_shots: Number of measurement samples
            progress_callback: Optional callback(stage, current, total, message) for progress updates
        
        Returns dictionary containing:
        - partition_info: partition details
        - state_vector: complex amplitudes
        - probabilities: measurement probabilities
        - counts: sampled measurement outcomes
        - density_matrix: density matrix (real and imaginary)
        - entropy_analysis: entanglement entropy data
        - fidelity: comparison between original and partitioned
    """
    def report_progress(stage: str, current: int, total: int, message: str = ""):
        print(f"[{current}/{total}] {stage}: {message}", flush=True)
        if progress_callback:
            try:
                progress_callback(stage, current, total, message)
            except Exception as e:
                pass
    
    num_qubits = circuit_data['num_qubits']
    simulator = QuantumCircuitSimulator(num_qubits)
    errors = []

    # Calculate dynamic step count
    total_steps = 7 + sum([compute_density_matrix, compute_entropy])
    step = 0

    # Build circuit with gate ID tracking
    step += 1
    report_progress("building_circuit", step, total_steps, "Building quantum circuit...")
    circuit, parameters, _ = CircuitConverter.json_to_squander(circuit_data, gate_ids=simulator.gate_ids)
    simulator.circuit = circuit
    simulator.parameters = parameters

    # Simulate original circuit
    step += 1
    report_progress("simulating_original", step, total_steps, "Simulating original circuit...")
    try:
        state_original = run_with_timeout(
            simulator.simulate_statevector,
            args=(circuit, parameters),
            timeout_seconds=simulation_timeout
        )
    except TimeoutError as e:
        report_progress("simulating_original", step, total_steps, f"Skipping original circuit simulation - timed out after {simulation_timeout}s")
        errors.append({'stage': 'simulating_original', 'error': str(e), 'timeout': True})
        state_original = np.zeros((simulator.matrix_size, 1), dtype=np.complex128)
        state_original[0] = 1.0 + 0j

    step += 1
    report_progress("calculating_probabilities", step, total_steps, "Calculating probabilities...")
    try:
        probs_original = run_with_timeout(
            simulator.get_probabilities,
            args=(state_original,),
            timeout_seconds=simulation_timeout
        )
    except TimeoutError as e:
        report_progress("calculating_probabilities", step, total_steps, f"Skipping probability calculation - timed out after {simulation_timeout}s")
        errors.append({'stage': 'calculating_probabilities', 'error': str(e), 'timeout': True})
        probs_original = np.zeros(simulator.matrix_size)

    step += 1
    report_progress("sampling_measurements", step, total_steps, f"Sampling {num_shots} measurements...")
    try:
        counts_original = run_with_timeout(
            simulator.sample_measurements,
            args=(state_original, num_shots),
            timeout_seconds=simulation_timeout
        )
    except TimeoutError as e:
        report_progress("sampling_measurements", step, total_steps, f"Skipping measurement sampling - timed out after {simulation_timeout}s")
        errors.append({'stage': 'sampling_measurements', 'error': str(e), 'timeout': True})
        counts_original = {}

    # partition circuit
    step += 1
    report_progress("partitioning", step, total_steps, f"Partitioning circuit (strategy: {strategy})...")

    # Create QASM file for qiskit/bqskit strategies
    qasm_strategies = ["qiskit", "qiskit-fusion", "bqskit-Quick", "bqskit-Scan", "bqskit-Greedy", "bqskit-Cluster"]
    qasm_file = None
    if strategy in qasm_strategies:
        fd, qasm_file = tempfile.mkstemp(suffix='.qasm', text=True)
        try:
            os.close(fd)
            CircuitConverter.squander_to_qasm(circuit, parameters, qasm_file)
        except Exception as e:
            if qasm_file and os.path.exists(qasm_file):
                os.unlink(qasm_file)
            raise RuntimeError(f"Failed to create QASM file for {strategy}: {str(e)}")

    try:
        partition_result = run_with_timeout(
            simulator.partition_circuit,
            args=(circuit, parameters, max_partition_size, strategy, qasm_file),
            timeout_seconds=simulation_timeout
        )
        partitioned_circ = partition_result['partitioned_circuit']
        partitioned_params = partition_result['partitioned_params']
    except TimeoutError as e:
        report_progress("partitioning", step, total_steps, f"Skipping circuit partitioning - timed out after {simulation_timeout}s")
        errors.append({'stage': 'partitioning', 'error': str(e), 'timeout': True})
        partition_result = {
            'partitioned_circuit': circuit,
            'partitioned_params': parameters,
            'partition_info': {
                'strategy': strategy,
                'max_partition_size': max_partition_size,
                'total_partitions': 0,
                'partitions': []
            }
        }
        partitioned_circ = circuit
        partitioned_params = parameters
    except Exception as e:
        if qasm_file and os.path.exists(qasm_file):
            os.unlink(qasm_file)
        raise
    finally:
        if qasm_file and os.path.exists(qasm_file):
            os.unlink(qasm_file)

    # simulate partitioned circuit
    step += 1
    report_progress("simulating_partitioned", step, total_steps, "Simulating partitioned circuit...")

    def simulate_partitioned_circuit():
        state = simulator.simulate_statevector(partitioned_circ, partitioned_params)
        probs = simulator.get_probabilities(state)
        counts = simulator.sample_measurements(state, num_shots)
        return state, probs, counts

    try:
        state_partitioned, probs_partitioned, counts_partitioned = run_with_timeout(
            simulate_partitioned_circuit,
            timeout_seconds=simulation_timeout
        )
    except TimeoutError as e:
        report_progress("simulating_partitioned", step, total_steps, f"Skipping partitioned circuit simulation - timed out after {simulation_timeout}s")
        errors.append({'stage': 'simulating_partitioned', 'error': str(e), 'timeout': True})
        state_partitioned = state_original.copy()
        probs_partitioned = probs_original.copy()
        counts_partitioned = counts_original.copy()

    # calculate fidelity
    step += 1
    report_progress("calculating_fidelity", step, total_steps, "Calculating fidelity...")
    try:
        fidelity = run_with_timeout(
            simulator.calculate_fidelity,
            args=(state_original, state_partitioned),
            timeout_seconds=simulation_timeout
        )
    except TimeoutError as e:
        report_progress("calculating_fidelity", step, total_steps, f"Skipping fidelity calculation - timed out after {simulation_timeout}s")
        errors.append({'stage': 'calculating_fidelity', 'error': str(e), 'timeout': True})
        fidelity = 0.0

    # density matrices
    density_original = None
    density_partitioned = None
    if compute_density_matrix:
        step += 1
        report_progress("computing_density_matrix", step, total_steps, "Computing density matrices...")

        def compute_density_matrices():
            dens_orig = simulator.get_density_matrix(state_original)
            dens_part = simulator.get_density_matrix(state_partitioned)
            return dens_orig, dens_part

        try:
            density_original, density_partitioned = run_with_timeout(
                compute_density_matrices,
                timeout_seconds=simulation_timeout
            )
        except TimeoutError as e:
            report_progress("computing_density_matrix", step, total_steps, f"Skipping density matrix computation - timed out after {simulation_timeout}s")
            errors.append({'stage': 'density_matrix', 'error': str(e), 'timeout': True})
        except Exception as e:
            errors.append({'stage': 'density_matrix', 'error': str(e)})
    
    # entropy analysis
    entropy_original = []
    entropy_partitioned = []
    if compute_entropy:
        step += 1
        report_progress("analyzing_entropy", step, total_steps, "Analyzing entanglement entropy...")
        try:
            entropy_original = run_with_timeout(
                simulator.analyze_entanglement_scaling,
                args=(circuit, parameters),
                timeout_seconds=simulation_timeout
            )
        except TimeoutError as e:
            report_progress("analyzing_entropy", step, total_steps, f"Skipping entropy analysis (original) - timed out after {simulation_timeout}s")
            errors.append({'stage': 'entropy_original', 'error': str(e), 'timeout': True})
        except Exception as e:
            errors.append({'stage': 'entropy_original', 'error': str(e)})

        try:
            entropy_partitioned = run_with_timeout(
                simulator.analyze_entanglement_scaling,
                args=(partitioned_circ, partitioned_params),
                timeout_seconds=simulation_timeout
            )
        except TimeoutError as e:
            report_progress("analyzing_entropy", step, total_steps, f"Skipping entropy analysis (partitioned) - timed out after {simulation_timeout}s")
            errors.append({'stage': 'entropy_partitioned', 'error': str(e), 'timeout': True})
        except Exception as e:
            errors.append({'stage': 'entropy_partitioned', 'error': str(e)})

    # finalizing results
    step += 1
    report_progress("finalizing", step, total_steps, "Finalizing results...")
    
    results = {
        'timestamp': int(time.time() * 1000),
        'num_qubits': num_qubits,
        'num_shots': num_shots,
        'errors': errors,
        'partition_info': partition_result['partition_info'],
        'original': {
            'state_vector': state_original,
            'probabilities': probs_original,
            'counts': counts_original,
            'density_matrix': {
                'real': density_original.real if density_original is not None else None,
                'imag': density_original.imag if density_original is not None else None
            },
            'entropy_scaling': entropy_original
        },
        'partitioned': {
            'state_vector': state_partitioned,
            'probabilities': probs_partitioned,
            'counts': counts_partitioned,
            'density_matrix': {
                'real': density_partitioned.real if density_partitioned is not None else None,
                'imag': density_partitioned.imag if density_partitioned is not None else None
            },
            'entropy_scaling': entropy_partitioned
        },
        'comparison': {
            'fidelity': fidelity,
            'probability_difference': np.abs(probs_original - probs_partitioned).tolist(),
            'max_difference': float(np.max(np.abs(probs_original - probs_partitioned)))
        }
    }

    return serialize_results(results)


def main():
    parser = argparse.ArgumentParser(description='SQUANDER Quantum Circuit Simulator')
    parser.add_argument('input', help='input circuit JSON file')
    parser.add_argument('--output', '-o', default='simulation_results.json', help='output results JSON file')
    parser.add_argument('--partition-size', '-p', type=int, default=4, help='maximum partition size (default: 4)')
    parser.add_argument(
        '--strategy', '-s',
        default='ilp-fusion',
        choices=['kahn', 'ilp', 'ilp-fusion', 'ilp-fusion-ca', 'tdag', 'gtqcp', 'qiskit', 'qiskit-fusion', 'bqskit-Quick', 'bqskit-Scan', 'bqskit-Greedy', 'bqskit-Cluster'],
        help='partitioning strategy (default: kahn)'
    )
    parser.add_argument('--shots', '-n', type=int, default=10000, help='number of measurement shots (default: 10000)')
    parser.add_argument('--timeout', '-t', type=int, default=None, help='simulation timeout in seconds (skips entropy analysis if set, default: None)')
    parser.add_argument('--skip-density-matrix', action='store_true', help='skip density matrix computation')
    parser.add_argument('--skip-entropy', action='store_true', help='skip entropy analysis')

    args = parser.parse_args()

    # load circuit data
    with open(args.input, 'r') as f:
        circuit_data = json.load(f)

    print(f"Running simulation for {circuit_data['num_qubits']}-qubit circuit...")
    print(f"Partition strategy: {args.strategy}, max size: {args.partition_size}")

    # run simulation
    results = run_simulation(
        circuit_data,
        max_partition_size=args.partition_size,
        strategy=args.strategy,
        num_shots=args.shots,
        simulation_timeout=args.timeout,
        compute_density_matrix=not args.skip_density_matrix,
        compute_entropy=not args.skip_entropy
    )
    
    # save results
    with open(args.output, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\nSimulation complete!")
    print(f"Results saved to: {args.output}")
    print(f"Fidelity: {results['comparison']['fidelity']:.10f}")
    print(f"Total partitions: {results['partition_info']['total_partitions']}")

if __name__ == "__main__":
    main()
