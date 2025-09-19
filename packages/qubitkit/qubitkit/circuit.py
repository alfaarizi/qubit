from typing import List, Set, Dict, Union, Any, Optional
from enum import IntEnum
import copy

from gate import Gate
from interfaces import Operation

class DepthResolution(IntEnum):
    # sub-circuit as single units (1 time unit)
    ATOMIC = 0
    # sub-circuit with real execution time (sequential)
    # sub-circuit must wait for all its dependencies first
    EXPANDED = 1
    # sub-circuit with real execution time + optimal scheduling
    # sub-circuit can start as soon as it has enough "depth budget" from its internal complexity
    FRAGMENTED = 2

class Circuit(Operation):
    def __init__(
        self,
        num_qubits: int,
        name: str = "Circuit",
        source_library: str = ""
    ):
        super().__init__()
        self.name: str = name
        self.gates: List[Union[Gate, Circuit]] = []
        self.metadata: Dict[str, Any] = {}
        self.source_library = source_library
        # private
        self._num_qubits: int = num_qubits
        self._qubits: Set[int] = set()
        self._qubits_dirty: bool = True
        self._dependencies_dirty: bool = True
        self._depth_dirty = True
        # DAG helper attributes
        self._gate_dict: Dict[int, Gate] = {}
        self._gate_qubit: Dict[int, Set[int]] = {}
        self._g: Dict[int, Set[int]] = {}
        self._rg: Dict[int, Set[int]] = {}
        self._s: Set[int] = set()
        # Depth cache separate by lists for each resolution
        self._gate_depths: List[List[Optional[int]]] = [[], [], []]
        self._depth_gates: List[Dict[int, List[int]]] = [{}, {}, {}]
        self._num_circuits: int = 0

    @property
    def num_gates_flat(self) -> int:
        return len(self.gates)

    @property
    def depth(self) -> int:
        """
        The time it takes to execute the circuit
        :return: the longest path in a DAG
        """
        return self.get_circ_depth(DepthResolution.EXPANDED)

    @property
    def num_qubits(self) -> int:
        return self._num_qubits

    @num_qubits.setter
    def num_qubits(self, value):
        self._num_qubits = value
        for gate in self.gates:
            gate.num_qubits = value

    @property
    def qubits(self) -> Set[int]:
        if not self._qubits_dirty:
            return self._qubits
        self._qubits.clear()
        for gate in self.gates:
            if isinstance(gate, Circuit):
                inner_qubits = gate.qubits
                self._qubits.update(inner_qubits)
                continue
            self._qubits.update(gate.target_qubits, gate.control_qubits)
        self._qubits_dirty = False
        return self._qubits

    def add_gate(self, gate: Union[Gate, 'Circuit']):
        involved_qubits = gate.qubits
        if involved_qubits:
            max_qubit = max(involved_qubits)
            if max_qubit >= self.num_qubits:
                raise IndexError(f"Qubit index {max_qubit} out of bounds for {self.num_qubits}-qubit Circuit")
        gate.num_qubits = self.num_qubits
        self.gates.append(gate.clone())
        self._determine_parents(self.num_gates_flat - 1)
        if isinstance(gate, Circuit):
            self._num_circuits += 1
        self._qubits_dirty, self._dependencies_dirty, self._depth_dirty = True, True, True

    def get_depth(self, gate_idx: int, depth_resolution: DepthResolution = DepthResolution.ATOMIC) -> int:
        if gate_idx >= self.num_gates_flat or gate_idx < 0:
            raise IndexError(f"gate index {gate_idx} out of bounds")

        cache = self._gate_depths[depth_resolution]
        num_cache = len(cache)
        while num_cache <= gate_idx:
            cache.append(None)
            num_cache += 1

        if self._gate_depths[depth_resolution][gate_idx] is not None:
            return self._gate_depths[depth_resolution][gate_idx]

        gate = self.gates[gate_idx]
        gate_depth = 1 + max(self.get_depth(p_idx, depth_resolution) for p_idx in gate.parents) if gate.parents else 1

        if isinstance(gate, Circuit):
            if depth_resolution == DepthResolution.EXPANDED:
                gate_depth = gate_depth - 1 + gate.get_circ_depth(DepthResolution.EXPANDED)
                # internal_depth = gate.get_circ_depth(DepthResolution.ATOMIC)
                # gate_depth += internal_depth - 1
            elif depth_resolution == DepthResolution.FRAGMENTED:
                pass

        self._gate_depths[depth_resolution][gate_idx] = gate_depth

        depth_gates = self._depth_gates[depth_resolution]
        if gate_depth not in depth_gates:
            depth_gates[gate_depth] = []
        depth_gates[gate_depth].append(gate_idx)

        return gate_depth

    def get_circ_depth(self, depth_resolution: DepthResolution = DepthResolution.ATOMIC) -> int:
        if not self.gates:
            return 0
        return max(self.get_depth(i, depth_resolution) for i in range(len(self.gates)))

    def get_parents(self, gate_idx: int) -> List[int]:
        return self.gates[gate_idx].parents if 0 <= gate_idx < self.num_gates_flat else []

    def get_children(self, gate_idx: int) -> List[int]:
        return self.gates[gate_idx].children if 0 <= gate_idx < self.num_gates_flat else []

    def build_dependencies(self, use_cache: bool = True):
        if use_cache and not self._dependencies_dirty:
            return

        self._gate_dict = {i: gate for i, gate in enumerate(self.gates)}
        self._gate_qubit = {i: gate.qubits for i, gate in enumerate(self.gates)}
        self._g, self._rg = {i: set() for i in self._gate_dict}, {i: set() for i in self._gate_dict}

        for gate_idx in self._gate_dict:
            for child_idx in self.gates[gate_idx].children:
                self._g[gate_idx].add(child_idx)
                self._rg[child_idx].add(gate_idx)

        self._s = {m for m in self._rg if len(self._rg[m]) == 0}
        self._dependencies_dirty = False

    def flatten(self, repeat: int = -1):
        flat_circuit = Circuit(
            self.num_qubits,
            self.name,
            self.source_library
        )
        for gate in self.gates:
            if isinstance(gate, Circuit) and repeat != 0:
                flat_circuit_inner = gate.flatten(-1 if repeat < 0 else repeat - 1)
                for inner_gate in flat_circuit_inner.gates:
                    flat_circuit.add_gate(inner_gate.clone())
            else:
                flat_circuit.add_gate(gate.clone())
        flat_circuit.metadata = self.metadata.copy()
        return flat_circuit

    def clone(self):
        new_circuit = Circuit(
            self.num_qubits,
            self.name,
            self.source_library
        )
        for gate in self.gates:
            new_gate = gate.clone()
            new_circuit.add_gate(new_gate)
        new_circuit.metadata = copy.deepcopy(self.metadata)
        return new_circuit

    def draw(self, show_depth: bool = True, depth_resolution: DepthResolution = DepthResolution.ATOMIC) -> str:
        def get_position_and_width(gate_idx, gate):
            if show_depth:
                depth = self._gate_depths[depth_resolution][gate_idx]
                start_col = sum(max_col_widths[d] + 1 for d in range(1, depth)) if depth > 1 else 0
                width = max_col_widths[depth]
            else:
                start_col = sum(len(self.gates[i].name) + 1 for i in range(gate_idx))
                width = len(gate.name) + (2 if isinstance(gate, Circuit) else 0)
            return start_col, width
        def draw_gate(gate_idx, gate):
            col, name_width = get_position_and_width(gate_idx, gate)
            col_center = col + (name_width-1) // 2
            for target in gate.target_qubits:
                lines[target][col:col + name_width] = list(gate.name.center(name_width, "─"))
                # draw control qubits
                for control in gate.control_qubits:
                    top_qubit, bottom_qubit = min(control, gate.target_qubits[0]), max(control, gate.target_qubits[0])
                    lines[control][col_center] = "●"
                    for qubit in range(top_qubit + 1, bottom_qubit):
                        if qubit in gate.qubits or lines[qubit][col_center] != "─":
                            continue
                        for k, char in enumerate("│"):
                            if lines[qubit][col_center + k] not in ["│", "●"]:
                                lines[qubit][col_center + k] = char
        def draw_circuit(gate_idx, gate):
            start_col, name_width = get_position_and_width(gate_idx, gate)
            involved_qubits = sorted(gate.qubits)
            for j, qubit in enumerate(involved_qubits):
                content = (
                    f"┌{gate.name.center(name_width - 2, '─')}┐" if j == 0 else
                    f"└{'─' * (name_width - 2)}┘" if j == len(involved_qubits) - 1 else
                    f"│{' ' * (name_width - 2)}│"
                )
                for k, char in enumerate(content):
                    if start_col + k < len(lines[qubit]):
                        lines[qubit][start_col + k] = char

        if show_depth:
            for i in range(len(self.gates)):
                if i >= len(self._gate_depths[depth_resolution]) or self._gate_depths[depth_resolution][i] is None:
                    self.get_depth(i, depth_resolution)
            max_col_widths = {
                depth: max(
                    len(self.gates[idx].name) + (2 if isinstance(self.gates[idx], Circuit) else 0)
                    for idx in gate_indices
                ) for depth, gate_indices in self._depth_gates[depth_resolution].items()
            }
            num_cols = sum(width+1 for width in max_col_widths.values()) - 1
        else:
            num_cols = 2*self._num_circuits + sum(len(gate.name)+1 for gate in self.gates) - 1

        lines = [["─"] * num_cols for _ in range(self.num_qubits)]

        for i, gate in enumerate(self.gates):
            if isinstance(gate, Circuit):
                draw_circuit(i, gate)
            else:
                draw_gate(i, gate)

        # label the lines
        label_width = 2 + len(str(self.num_qubits))
        return f"{self.name} ({depth_resolution.name.capitalize() if show_depth else 'Sequential'}):\n" + "\n".join(
            f"{('q'+str(i)+':').rjust(label_width)} {''.join(row)}"
            for i, row in enumerate(lines)
        ) + "\n"

    def _determine_parents(self, gate_idx: int):
        gate = self.gates[gate_idx]
        gate_qubits = set(gate.qubits)
        # clear gate parents
        gate.parents.clear()
        for prev_gate in self.gates[:gate_idx]:
            if gate_idx in prev_gate.children:
                prev_gate.children.remove(gate_idx)
        for i in range(gate_idx-1, -1, -1):
            parent_gate = self.gates[i]
            parent_qubits = parent_gate.qubits
            qubit_overlap = gate_qubits & parent_qubits
            if qubit_overlap:
                gate.parents.append(i)
                parent_gate.children.append(gate_idx)
                gate_qubits -= qubit_overlap
                if not gate_qubits:
                    break

    def __repr__(self) -> str:
        return f"{self.name}({self.num_qubits})"

    def __str__(self):
        return self.draw()

    def validate_dependencies(self):
        print(f"validating_dependencies of circuit {self.name}")
        # check 1: All parent-child relationships are bidirectional and valid
        for i, gate in enumerate(self.gates):
            print(f"Gate {i} ({gate.name}): parents={gate.parents}, children={gate.children}")
            # check parents
            for parent_idx in gate.parents:
                assert 0 <= parent_idx < len(self.gates), f"Gate {i} has invalid parent index {parent_idx}"
                assert parent_idx < i, f"Gate {i} has parent {parent_idx} that comes after it"
                assert i in self.gates[parent_idx].children, \
                    f"Gate {i} claims parent {parent_idx}, but parent doesn't claim it as child"
            # check children
            for child_idx in gate.children:
                assert 0 <= child_idx < len(self.gates), f"Gate {i} has invalid child index {child_idx}"
                assert child_idx > i, f"Gate {i} has child {child_idx} that comes before it"
                assert i in self.gates[child_idx].parents, \
                    f"Gate {i} claims child {child_idx}, but child doesn't claim it as parent"
        # Check 2: dependencies make sense based on qubit overlap
        for i, gate in enumerate(self.gates):
            gate_qubits = gate.qubits
            for parent_idx in gate.parents:
                parent_qubits = self.gates[parent_idx].qubits
                assert gate_qubits & parent_qubits, f"Gate {i} and parent {parent_idx} have no qubit overlap"
        # Check 3: no duplicate relationships
        for i, gate in enumerate(self.gates):
            assert len(gate.parents) == len(set(gate.parents)), f"Gate {i} has duplicate parents"
            assert len(gate.children) == len(set(gate.children)), f"Gate {i} has duplicate children"

        for i, gate in enumerate(self.gates):
            if isinstance(gate, Circuit):
                print(f"  Validating sub-circuit: {gate.name}, {gate.parents}, {gate.children}")
                gate.validate_dependencies()

        print(f"✓ Circuit {self.name} passes all dependency checks")

# Example: Adding Circuit as a gate
if __name__ == "__main__":
    # Example: Adding Circuit as a gate
    from qiskit import QuantumCircuit
    from qiskit.circuit import Instruction

    print("=== CIRCUIT COMPARISON ===\n")

    # Inner Circuit
    print("1. INNER CIRCUIT:")
    inner_circuit_qiskit = QuantumCircuit(3, name='inner')
    inner_circuit_qiskit.h(0)
    inner_circuit_qiskit.cx(0, 2)
    inner_instruction = inner_circuit_qiskit.to_instruction()

    # Your circuit equivalent
    inner_circuit_yours = Circuit(3, "inner")
    inner_circuit_yours.add_gate(Gate("H", [0]))
    inner_circuit_yours.add_gate(Gate("CNOT", [2], [0]))
    print()

    print(inner_circuit_qiskit)
    print(inner_circuit_yours)

    print(f"  Qiskit depth: {inner_circuit_qiskit.depth()}")
    print(f"  Your depth: {inner_circuit_yours.get_circ_depth()} | {inner_circuit_yours.depth}")
    print(f"  Qiskit decomposed: {inner_circuit_qiskit.decompose().depth()}")
    print()

    # Circuit Top
    print("2. CIRCUIT TOP:")
    circuit_top_qiskit = QuantumCircuit(3, name='top')
    circuit_top_qiskit.x(2)
    circuit_top_qiskit.append(inner_instruction, [0, 1, 2])
    circuit_top_qiskit.y(0)

    circuit_top_yours = Circuit(3, "top")
    circuit_top_yours.add_gate(Gate("X", [2]))
    circuit_top_yours.add_gate(inner_circuit_yours)
    circuit_top_yours.add_gate(Gate("Y", [0]))
    print()

    print(circuit_top_qiskit)
    print(circuit_top_yours)
    print(circuit_top_yours.flatten())
    print(circuit_top_yours._depth_gates)

    print(f"  Qiskit depth: {circuit_top_qiskit.depth()}")
    print(f"  Your depth: {circuit_top_yours.get_circ_depth()} | {circuit_top_yours.depth}")
    print(f"  Qiskit decomposed: {circuit_top_qiskit.decompose().depth()}")
    print()

    # Circuit Top 2
    print("3. CIRCUIT TOP 2:")
    circuit_top_2_qiskit = QuantumCircuit(3, name='top_2')
    circuit_top_2_qiskit.x(1)
    circuit_top_2_qiskit.x(1)
    circuit_top_2_qiskit.append(inner_instruction, [0, 1, 2])
    circuit_top_2_qiskit.y(0)

    circuit_top_2_yours = Circuit(3, "top_2")
    circuit_top_2_yours.add_gate(Gate("X", [1]))
    circuit_top_2_yours.add_gate(Gate("X", [1]))
    circuit_top_2_yours.add_gate(inner_circuit_yours)
    circuit_top_2_yours.add_gate(Gate("Y", [0]))
    print()

    print(f"  Qiskit depth: {circuit_top_2_qiskit.depth()}")
    print(f"  Your depth: {circuit_top_2_yours.get_circ_depth()} | {circuit_top_2_yours.depth}")
    print(f"  Qiskit decomposed: {circuit_top_2_qiskit.decompose().depth()}")
    print()

    # Circuit B (simplified)
    print("4. CIRCUIT B (TETRIS - simplified):")
    CircuitB_qiskit = QuantumCircuit(12, name='tetris')
    CircuitB_qiskit.h([0, 1, 2, 3, 4])
    CircuitB_qiskit.cx(5, 0)
    CircuitB_qiskit.cx(6, 1)
    CircuitB_qiskit.cx(7, 2)
    CircuitB_qiskit.cx(8, 3)
    CircuitB_qiskit.cx(9, 4)
    CircuitB_qiskit.cx(7, 1)
    CircuitB_qiskit.x(8)
    CircuitB_qiskit.cx(9, 1)
    CircuitB_qiskit.h(7)
    CircuitB_qiskit.cx(11, 1)
    CircuitB_qiskit.x(6)  # Simplified XX gates to X
    CircuitB_qiskit.x(11)
    CircuitB_qiskit.x(6)

    CircuitB_yours = Circuit(12, "tetris")
    CircuitB_yours.add_gate(Gate("H", [0]))
    CircuitB_yours.add_gate(Gate("H", [1]))
    CircuitB_yours.add_gate(Gate("H", [2]))
    CircuitB_yours.add_gate(Gate("H", [3]))
    CircuitB_yours.add_gate(Gate("H", [4]))
    CircuitB_yours.add_gate(Gate("CNOT", [0], [5]))
    CircuitB_yours.add_gate(Gate("CNOT", [1], [6]))
    CircuitB_yours.add_gate(Gate("CNOT", [2], [7]))
    CircuitB_yours.add_gate(Gate("CNOT", [3], [8]))
    CircuitB_yours.add_gate(Gate("CNOT", [4], [9]))
    CircuitB_yours.add_gate(Gate("CNOT", [1], [7]))
    CircuitB_yours.add_gate(Gate("X", [8]))
    CircuitB_yours.add_gate(Gate("CNOT", [1], [9]))
    CircuitB_yours.add_gate(Gate("H", [7]))
    CircuitB_yours.add_gate(Gate("CNOT", [1], [11]))
    CircuitB_yours.add_gate(Gate("X", [6]))
    CircuitB_yours.add_gate(Gate("X", [11]))
    CircuitB_yours.add_gate(Gate("X", [6]))
    print()

    CircuitB_yours_inner = Circuit(3, "AB")
    CircuitB_yours_inner.add_gate(Gate("H", [2]))
    CircuitB_yours_inner.add_gate(Gate("CX", [0], [2]))
    CircuitB_yours_inner.add_gate(Gate("CX", [0], [2]))
    # CircuitB_yours.add_gate(Gate("H", [2]))
    CircuitB_yours.add_gate(Gate("H", [0]))

    CircuitB_yours_inner_inner = Circuit(3, "BCA")
    CircuitB_yours_inner_inner.add_gate(CircuitB_yours_inner)
    print(CircuitB_yours_inner_inner)

    CircuitB_yours.add_gate(CircuitB_yours_inner_inner)
    print(CircuitB_yours._depth_gates)
    print()

    print(CircuitB_yours_inner)
    print("CIRCUIT INDEX", len(CircuitB_yours.gates)-1)
    print("DIFFERENT RESOLUTIONS")

    print("SEQUENTIAL\n", CircuitB_yours.draw(False))

    print("BASIC\n", CircuitB_yours.draw(True,DepthResolution.ATOMIC))
    print(CircuitB_yours._depth_gates[DepthResolution.ATOMIC], "\n\n")

    print("EXPANDED\n", CircuitB_yours.draw(True, DepthResolution.EXPANDED))
    print(CircuitB_yours._depth_gates[DepthResolution.EXPANDED], "\n\n")

    print("FRAGMENTED\n", CircuitB_yours.draw(True, DepthResolution.FRAGMENTED))
    print(CircuitB_yours._depth_gates[DepthResolution.FRAGMENTED], "\n\n")

    print(CircuitB_yours.flatten())


    print(f"  Qiskit depth: {CircuitB_qiskit.depth()}")
    print(f"  Your depth: {CircuitB_yours.get_circ_depth()} | {CircuitB_yours.depth}")
    print(f"  Qiskit decomposed: {CircuitB_qiskit.decompose().depth()}")
    print()

    # Circuit C
    print("5. CIRCUIT C:")
    circuit_c_qiskit = QuantumCircuit(3)
    circuit_c_qiskit.append(inner_instruction, [0, 1, 2])

    circuit_c_yours = Circuit(3)
    circuit_c_yours.add_gate(inner_circuit_yours)
    print()

    print(f"  Qiskit depth: {circuit_c_qiskit.depth()}")
    print(f"  Your depth: {circuit_c_yours.get_circ_depth()} | {circuit_c_yours.depth}")
    print(f"  Qiskit decomposed: {circuit_c_qiskit.decompose().depth()}")
    print()

    print("=== ANALYSIS ===")
    print("- 'Your depth' shows: get_circ_depth(expand=False) | depth (expand=True)")
    print("- 'Qiskit decomposed' should match your expanded depth")
    print("- Differences may indicate issues in depth calculation logic")