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
import numpy as np
from typing import Dict, List, Optional, Callable

from squander import Circuit
from squander.partitioning.partition import PartitionCircuit
from convert import CircuitConverter

class QuantumCircuitSimulator:    
    def __init__(self, num_qubits: int):
        self.num_qubits = num_qubits
        self.circuit = None
        self.parameters = None
        self.matrix_size = 1 << num_qubits
        self.gate_ids = []

    def partition_circuit(self, circuit: Circuit, parameters: np.ndarray, max_partition_size: int = 4, strategy: str = 'kahn') -> Dict:
        partitioned_circ, partitioned_params, partition_assignments = PartitionCircuit(
            circuit, parameters, max_partition_size, strategy
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
    """convert complex numpy array to JSON-serializable format"""
    if np.iscomplexobj(arr):
        return [{'real': float(x.real), 'imag': float(x.imag)} for x in arr.flatten()]
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
    progress_callback: Optional[Callable[[str, int, int, str], None]] = None
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
        - unitary: unitary matrix (if small enough)
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
    
    # Build circuit with gate ID tracking
    report_progress("building_circuit", 1, 11, "Building quantum circuit...")
    circuit, parameters, _ = CircuitConverter.json_to_squander(circuit_data, gate_ids=simulator.gate_ids)
    simulator.circuit = circuit
    simulator.parameters = parameters
    
    # Simulate original circuit
    report_progress("simulating_original", 2, 11, "Simulating original circuit...")
    state_original = simulator.simulate_statevector(circuit, parameters)
    
    report_progress("calculating_probabilities", 3, 11, "Calculating probabilities...")
    probs_original = simulator.get_probabilities(state_original)
    
    report_progress("sampling_measurements", 4, 11, f"Sampling {num_shots} measurements...")
    counts_original = simulator.sample_measurements(state_original, num_shots)
    
    # partition circuit
    report_progress("partitioning", 5, 11, f"Partitioning circuit (strategy: {strategy})...")
    partition_result = simulator.partition_circuit(
        circuit, parameters, max_partition_size, strategy
    )
    partitioned_circ = partition_result['partitioned_circuit']
    partitioned_params = partition_result['partitioned_params']
    
    # simulate partitioned circuit
    report_progress("simulating_partitioned", 6, 11, "Simulating partitioned circuit...")
    state_partitioned = simulator.simulate_statevector(partitioned_circ, partitioned_params)
    probs_partitioned = simulator.get_probabilities(state_partitioned)
    counts_partitioned = simulator.sample_measurements(state_partitioned, num_shots)
    
    # calculate fidelity
    report_progress("calculating_fidelity", 7, 11, "Calculating fidelity...")
    fidelity = simulator.calculate_fidelity(state_original, state_partitioned)
    
    # density matrices
    report_progress("computing_density_matrix", 8, 11, "Computing density matrices...")
    density_original = None
    density_partitioned = None
    try:
        density_original = simulator.get_density_matrix(state_original)
        density_partitioned = simulator.get_density_matrix(state_partitioned)
    except Exception as e:
        errors.append({'stage': 'density_matrix', 'error': str(e)})
    
    # entropy analysis
    report_progress("analyzing_entropy", 9, 11, "Analyzing entanglement entropy...")
    entropy_original = []
    entropy_partitioned = []
    try:
        entropy_original = simulator.analyze_entanglement_scaling(circuit, parameters)
    except Exception as e:
        errors.append({'stage': 'entropy_original', 'error': str(e)})
    
    try:
        entropy_partitioned = simulator.analyze_entanglement_scaling(partitioned_circ, partitioned_params)
    except Exception as e:
        errors.append({'stage': 'entropy_partitioned', 'error': str(e)})
    
    # compute unitary matrices
    report_progress("computing_unitary", 10, 11, "Computing unitary matrices...")
    unitary_original = None
    unitary_partitioned = None
    try:
        unitary_original = simulator.get_unitary_matrix(circuit, parameters)
    except Exception as e:
        errors.append({'stage': 'unitary_original', 'error': str(e)})
    try:
        unitary_partitioned = simulator.get_unitary_matrix(partitioned_circ, partitioned_params)
    except Exception as e:
        errors.append({'stage': 'unitary_partitioned', 'error': str(e)})
    
    # finalizing results
    report_progress("finalizing", 11, 11, "Finalizing results...")
    
    results = {
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
            'entropy_scaling': entropy_original,
            'unitary': unitary_original
        },
        'partitioned': {
            'state_vector': state_partitioned,
            'probabilities': probs_partitioned,
            'counts': counts_partitioned,
            'density_matrix': {
                'real': density_partitioned.real if density_partitioned is not None else None,
                'imag': density_partitioned.imag if density_partitioned is not None else None
            },
            'entropy_scaling': entropy_partitioned,
            'unitary': unitary_partitioned
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
    parser.add_argument('--strategy', '-s', default='kahn', 
                        choices=['kahn', 'ilp', 'ilp-fusion', 'ilp-fusion-ca', 'tdag', 'gtqcp', 
                                'qiskit', 'qiskit-fusion', 'bqskit-Quick', 'bqskit-Scan', 
                                'bqskit-Greedy', 'bqskit-Cluster'], 
                        help='partitioning strategy (default: kahn)')
    parser.add_argument('--shots', '-n', type=int, default=10000, help='number of measurement shots (default: 10000)')
    
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
        num_shots=args.shots
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
