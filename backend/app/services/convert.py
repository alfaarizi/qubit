#!/usr/bin/env python3
"""
SQUANDER Circuit Conversion Module

Converts between quantum circuit formats: QASM, Qiskit, BQSKit, and JSON.

Usage:
    python convert.py input.qasm --output output.json
    python convert.py input.json --to-qasm --output output.qasm
"""

import json
import argparse
import numpy as np
from typing import List, NamedTuple
from squander import Circuit, Qiskit_IO, utils

class GateSpec(NamedTuple):
    """Specification for a quantum gate."""
    method: str
    num_qubits: int
    params: List[float]

class GateRegistry:
    """Registry of supported quantum gates."""
    SQUANDER_GATES = {
        'H': GateSpec('add_H', 1, []),
        'X': GateSpec('add_X', 1, []),
        'Y': GateSpec('add_Y', 1, []),
        'Z': GateSpec('add_Z', 1, []),
        'S': GateSpec('add_S', 1, []),
        'T': GateSpec('add_T', 1, []),
        'SDG': GateSpec('add_Sdg', 1, []),
        'TDG': GateSpec('add_Tdg', 1, []),
        'SX': GateSpec('add_SX', 1, []),
        'RX': GateSpec('add_RX', 1, [np.pi/2]),
        'RY': GateSpec('add_RY', 1, [np.pi/2]),
        'RZ': GateSpec('add_RZ', 1, [np.pi/2]),
        'R': GateSpec('add_R', 1, [np.pi]),
        'U1': GateSpec('add_U1', 1, [0]),
        'U2': GateSpec('add_U2', 1, [0, 0]),
        'U3': GateSpec('add_U3', 1, [0, 0, 0]),
        'CNOT': GateSpec('add_CNOT', 2, []),
        'CX': GateSpec('add_CNOT', 2, []),
        'CZ': GateSpec('add_CZ', 2, []),
        'CH': GateSpec('add_CH', 2, []),
        'SYC': GateSpec('add_SYC', 2, []),
        'CRY': GateSpec('add_CRY', 2, [np.pi/2]),
        'CRZ': GateSpec('add_CRZ', 2, [np.pi/2]),
        'CRX': GateSpec('add_CRX', 2, [np.pi/2]),
        'CP': GateSpec('add_CP', 2, [0]),
        'CR': GateSpec('add_CR', 2, [np.pi]),
        'CROT': GateSpec('add_CROT', 2, [0, 0, 0]),
        'CU': GateSpec('add_CU', 2, [0, 0, 0, 0]),
        'SWAP': GateSpec('add_SWAP', 2, []),
        'CSWAP': GateSpec('add_CSWAP', 3, []),
        'CCX': GateSpec('add_CCX', 3, []),
        'TOFFOLI': GateSpec('add_CCX', 3, []),
    }

def add_gate(circuit: Circuit, gate_name: str, target_qubits: List[int], control_qubits: List[int], gate_params: List[float]) -> List[float]:
    """Add a gate to a SQUANDER circuit using the gate registry."""
    if gate_name not in GateRegistry.SQUANDER_GATES:
        raise ValueError(f"Unsupported gate: {gate_name}")

    gate_spec = GateRegistry.SQUANDER_GATES[gate_name]
    method = getattr(circuit, gate_spec.method)

    if gate_spec.num_qubits == 1:
        method(target_qubits[0])
    elif gate_spec.num_qubits == 2:
        if gate_name == 'SWAP':
            method(target_qubits)
        else:
            method(target_qubits[0], control_qubits[0])
    elif gate_spec.num_qubits == 3:
        if gate_name == 'CSWAP':
            method(target_qubits, control_qubits)
        else:
            method(target_qubits[0], control_qubits)

    return gate_params if gate_params else gate_spec.params


class CircuitConverter:
    """Convert between SQUANDER, QASM, Qiskit, and BQSKit formats."""

    @staticmethod
    def qasm_to_squander(qasm_file: str) -> tuple[Circuit, np.ndarray, int]:
        """Convert QASM file to SQUANDER Circuit using SQUANDER's built-in converter."""
        try:
            circuit, parameters = utils.qasm_to_squander_circuit(qasm_file)
            num_qubits = circuit.get_Qbit_Num()
            return circuit, parameters, num_qubits
        except Exception as e:
            from qiskit import QuantumCircuit
            qiskit_circuit = QuantumCircuit.from_qasm_file(qasm_file)
            circuit, parameters = Qiskit_IO.convert_Qiskit_to_Squander(qiskit_circuit)
            num_qubits = circuit.get_Qbit_Num()
            return circuit, parameters, num_qubits

    @staticmethod
    def qiskit_to_squander(qiskit_circuit) -> tuple[Circuit, np.ndarray, int]:
        """Convert Qiskit QuantumCircuit to SQUANDER Circuit."""
        circuit, parameters = Qiskit_IO.convert_Qiskit_to_Squander(qiskit_circuit)
        num_qubits = circuit.get_Qbit_Num()
        return circuit, parameters, num_qubits

    @staticmethod
    def bqskit_to_squander(bqskit_circuit) -> tuple[Circuit, np.ndarray, int]:
        """Convert BQSKit Circuit to SQUANDER Circuit."""
        qiskit_circuit = bqskit_circuit.to_qiskit()
        return CircuitConverter.qiskit_to_squander(qiskit_circuit)

    @staticmethod
    def json_to_squander(circuit_data: dict, start_qubit: int = 0, gate_ids: list = None) -> tuple[Circuit, np.ndarray, int]:
        """Convert JSON/dict format to SQUANDER Circuit."""
        circuit = Circuit(circuit_data['num_qubits'])
        parameters = []
        for gate_info in circuit_data['placed_gates']:
            if 'circuit' in gate_info:
                c_start_qubit = gate_info.get('start_qubit', 0) + start_qubit
                c_circuit_data = {
                    'num_qubits': circuit_data['num_qubits'],
                    'placed_gates': gate_info['circuit']['gates']
                }
                c, c_params, _ = CircuitConverter.json_to_squander(c_circuit_data, c_start_qubit, gate_ids)
                for c_gates in c.get_Gates():
                    circuit.add_Gate(c_gates)
                parameters.extend(c_params)
                continue
            gate_name = gate_info['gate']['name'].upper()
            target_qubits = [q + start_qubit for q in gate_info['target_qubits']]
            control_qubits = [q + start_qubit for q in gate_info['control_qubits']]
            gate_params = gate_info.get('parameters', [])
            if gate_ids is not None:
                gate_id = gate_info.get('id')
                if gate_id:
                    gate_ids.append(gate_id)
            params = add_gate(circuit, gate_name, target_qubits, control_qubits, gate_params)
            parameters.extend(params)
        num_qubits = circuit.get_Qbit_Num()
        return circuit, np.array(parameters, dtype=np.float64), num_qubits

    @staticmethod
    def squander_to_qasm(circuit: Circuit, parameters: np.ndarray, output_file: str) -> None:
        """Convert SQUANDER Circuit to QASM file."""
        qiskit_circuit = Qiskit_IO.get_Qiskit_Circuit(circuit, parameters)
        try:
            # try new Qiskit API
            from qiskit import qasm2
            qasm_str = qasm2.dumps(qiskit_circuit)
        except (ImportError, AttributeError):
            # fall back to old Qiskit API (v0.x)
            qasm_str = qiskit_circuit.qasm()
        with open(output_file, 'w') as f:
            f.write(qasm_str)

    @staticmethod
    def squander_to_qiskit(circuit: Circuit, parameters: np.ndarray):
        """Convert SQUANDER Circuit to Qiskit QuantumCircuit."""
        return Qiskit_IO.get_Qiskit_Circuit(circuit, parameters)

    @staticmethod
    def squander_to_bqskit(circuit: Circuit, parameters: np.ndarray):
        """Convert SQUANDER Circuit to BQSKit Circuit."""
        try:
            from bqskit import Circuit as BQSKitCircuit
        except ImportError:
            raise ImportError("BQSKit is required. Install with: pip install bqskit")
        qiskit_circuit = CircuitConverter.squander_to_qiskit(circuit, parameters)
        return BQSKitCircuit.from_qiskit(qiskit_circuit)

    @staticmethod
    def qasm_to_json(qasm_file: str, output_file: str) -> None:
        """Convert QASM file to JSON format."""
        circuit, parameters, num_qubits = CircuitConverter.qasm_to_squander(qasm_file)
        gates_list = circuit.get_Gates()
        placed_gates = []
        
        param_idx = 0
        for idx, gate in enumerate(gates_list, 1):
            gate_name = gate.get_Name()
            gate_spec = GateRegistry.SQUANDER_GATES.get(gate_name.upper())
            
            # Determine how many parameters this gate uses
            num_params = len(gate_spec.params) if gate_spec else 0
            gate_params = parameters[param_idx:param_idx + num_params].tolist() if num_params > 0 else []
            param_idx += num_params
            
            gate_dict = {
                'id': f'gate-{idx:03d}',
                'gate': {'name': gate_name},
                'target_qubits': [gate.get_Target_Qbit()] if gate.get_Target_Qbit() >= 0 else [],
                'control_qubits': [gate.get_Control_Qbit()] if gate.get_Control_Qbit() >= 0 else [],
                'parameters': gate_params
            }
            placed_gates.append(gate_dict)
        
        circuit_data = {
            'num_qubits': num_qubits,
            'placed_gates': placed_gates,
            'circuit_parameters': parameters.tolist()
        }
        with open(output_file, 'w') as f:
            json.dump(circuit_data, f, indent=2)

    @staticmethod
    def json_to_qasm(json_file: str, output_file: str) -> None:
        """Convert JSON format to QASM file."""
        with open(json_file, 'r') as f:
            circuit_data = json.load(f)
        circuit, parameters, num_qubits = CircuitConverter.json_to_squander(circuit_data)
        qiskit_circuit = Qiskit_IO.get_Qiskit_Circuit(circuit, parameters)
        try:
            qasm_str = qiskit_circuit.qasm()
        except AttributeError:
            from qiskit import qasm2
            qasm_str = qasm2.dumps(qiskit_circuit)
        with open(output_file, 'w') as f:
            f.write(qasm_str)


def main():
    parser = argparse.ArgumentParser(description='SQUANDER Circuit Format Converter')
    parser.add_argument('input', help='Input file (QASM or JSON)')
    parser.add_argument('--output', '-o', required=True, help='Output file')
    parser.add_argument('--to-qasm', action='store_true', help='Convert JSON to QASM')
    parser.add_argument('--to-json', action='store_true', help='Convert QASM to JSON')

    args = parser.parse_args()

    if not args.to_qasm and not args.to_json:
        if args.input.endswith(('.qasm', '.qasm2')):
            args.to_json = True
        elif args.input.endswith('.json'):
            args.to_qasm = True
        else:
            parser.error("Cannot auto-detect format. Use --to-qasm or --to-json")

    try:
        if args.to_json:
            print(f"Converting QASM to JSON: {args.input} -> {args.output}")
            CircuitConverter.qasm_to_json(args.input, args.output)
            print("Conversion complete!")
        elif args.to_qasm:
            print(f"Converting JSON to QASM: {args.input} -> {args.output}")
            CircuitConverter.json_to_qasm(args.input, args.output)
            print("Conversion complete!")
    except Exception as e:
        print(f"Error: {e}")
        return 1
    return 0


if __name__ == "__main__":
    exit(main())
