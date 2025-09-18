from typing import List, Set, Dict, Union, Any, Optional
import copy

from gate import Gate
from interfaces import Operation

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
        # Draw helper attributes
        self._gate_depths: List[Optional[int]] = []
        self._depth_gates: Dict[int, List[int]] = {}
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
        return self.get_circ_depth(expand=True)

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

    def get_depth(self, gate_idx: int, expand: bool = False) -> int:
        """
        The time it takes to execute the circuit.

        :param gate_idx:
        :param atomic:  if True, expand into sub-circuits
                        if False, treat each sub-circuit as atomic
        :return: the longest path in a DAG
        """
        if gate_idx >= self.num_gates_flat or gate_idx < 0:
            raise IndexError(f"gate index {gate_idx} out of bounds")

        if not expand:
            gate_depths_len = len(self._gate_depths)
            while gate_depths_len <= gate_idx:
                self._gate_depths.append(None)
                gate_depths_len += 1

            if self._gate_depths[gate_idx] is not None:
                return self._gate_depths[gate_idx]

        gate = self.gates[gate_idx]
        gate_depth = 1 + max(self.get_depth(p_idx, expand=expand) for p_idx in gate.parents) if gate.parents else 1
        if expand and isinstance(gate, Circuit):
            gate_depth = gate_depth - 1 + gate.get_circ_depth(expand=False)

        if not expand:
            self._gate_depths[gate_idx] = gate_depth
            if gate_depth not in self._depth_gates:
                self._depth_gates[gate_depth] = []
            self._depth_gates[gate_depth].append(gate_idx)

        return gate_depth

    def get_circ_depth(self, expand: bool = False) -> int:
        if not self.gates:
            return 0
        return max(self.get_depth(i, expand=expand) for i in range(len(self.gates)))

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

    def draw(self, show_depth: bool = True) -> str:
        # get gate width including sub-circuit borders
        def get_gate_width(gate, calculate_sub_circuit: bool = True):
            if isinstance(gate, Circuit):
                if calculate_sub_circuit:
                    return max(len(gate.name) + 2, len(gate.flatten().gates) * 2)
                return max(len(gate.name) + 2, gate.get_circ_depth() * 2)
            return len(gate.name)
        def get_gate_position(gate_idx, gate):
            if show_depth:
                depth = self._gate_depths[gate_idx]
                col = sum(depth_widths[d] + 1 for d in range(1, depth)) if depth > 1 else 0
                name_width = depth_widths[depth]
            else:
                col = sum(max(1, get_gate_width(g)) + 1 for g in self.gates[:gate_idx])
                name_width = max(1, get_gate_width(gate))
            return col, name_width
        def draw_preserving_controls(line, column, content):
            for k, char in enumerate(content):
                if line[column + k] not in ["│", "●"]:
                    line[column + k] = char
        def draw_gate(gate_idx, gate):
            col, name_width = get_gate_position(gate_idx, gate)
            col_center = col + (name_width-1) // 2
            # draw target qubits
            for target in gate.target_qubits:
                lines[target][col:col + name_width] = list(gate.name.center(name_width, "─"))
            # draw control qubits
            for control in gate.control_qubits:
                top_qubit, bottom_qubit = min(control, gate.target_qubits[0]), max(control, gate.target_qubits[0])
                lines[control][col_center] = "●"
                for qubit in range(top_qubit + 1, bottom_qubit):
                    if qubit not in gate.qubits and lines[qubit][col_center] == "─":
                        draw_preserving_controls(lines[qubit], col_center,"│")
        def draw_sub_circuit(gate_idx, gate):
            col, name_width = get_gate_position(gate_idx, gate)
            involved_qubits = sorted(gate.qubits)
            for j, qubit in enumerate(involved_qubits):
                content = (
                    f"┌{gate.name.center(name_width - 2, '─')}┐" if j == 0 else # top line
                    f"└{'─' * (name_width - 2)}┘" if j == len(involved_qubits) - 1 else # bottom line
                    f"│{' ' * (name_width - 2)}│" # middle lines
                )
                draw_preserving_controls(lines[qubit], col, content)

        # calculate widths and columns
        # flatten_top = self.flatten(self._layer-1)
        # print("NUM CIRCUITS", self._num_circuits, "; DEPTH", self.get_circ_depth())
        if show_depth:
            depth_widths = {}
            # ensures all the depths are calculated
            for i in range(len(self.gates)):
                if i >= len(self._gate_depths) or self._gate_depths[i] is None:
                    self.get_depth(i)
            for depth, gate_indices in self._depth_gates.items():
                max_width = max(get_gate_width(self.gates[idx]) for idx in gate_indices)
                depth_widths[depth] = max_width
            num_columns = sum(width + 1 for width in depth_widths.values()) - 1  # no padding on the last
        else:
            num_columns = sum(max(1, get_gate_width(gate)) + 1 for gate in self.gates) - 1

        lines = [["─"] * num_columns for _ in range(self.num_qubits)]

        # START
        # flat_circ = self.flatten()
        # _ = flat_circ.get_circ_depth()
        # print("flat", flat_circ._gate_depths)
        # print("flat", flat_circ._depth_gates)

        # gate_depths = [len(flat_circ.gates[gate_idx].name) for gate_idx, gate_depth in enumerate(flat_circ._gate_depths)]
        # print(gate_depths)

        # depth_widths_2 = {
        #     depth: max((len(flat_circ.gates[idx].name)) for idx in gate_indices)
        #     for depth, gate_indices in flat_circ._depth_gates.items()
        # }
        # total_cols = sum(width+1 for width in depth_widths_2.values())-1
        #
        # print(total_cols, depth_widths_2)
        # lines_2 = [["─"] * total_cols for _ in range(self.num_qubits)]

        # for i, gate in enumerate(self.gates):
        #     if isinstance(gate, Circuit):
        #         flat_circ_inner = gate.flatten()
        #         some = flat_circ_inner.get_circ_depth()
        #         print(f"{gate.name}.get_circ_depth", some)
        #         # pos = the depth of its first gate relative to the flat circuit
        #         print(gate.name, "pos=", "dept=", gate.get_circ_depth())



        for i, gate in enumerate(self.gates):
            if isinstance(gate, Circuit):
                draw_sub_circuit(i, gate)
            else:
                draw_gate(i, gate)

        # label the lines
        label_width = 2 + len(str(self.num_qubits))
        return f"{self.name}:\n" + "\n".join(
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

    def __repr__(self) -> str:
        return f"{self.name}({self.num_qubits})"

    def __str__(self):
        return self.draw(show_depth=True)

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

    CircuitB_yours_inner = Circuit(3)
    CircuitB_yours_inner.add_gate(Gate("H", [2]))
    CircuitB_yours_inner.add_gate(Gate("CX", [0], [2]))
    CircuitB_yours_inner.add_gate(Gate("CX", [0], [2]))
    # CircuitB_yours.add_gate(Gate("H", [2]))
    CircuitB_yours.add_gate(Gate("H", [0]))
    CircuitB_yours.add_gate(CircuitB_yours_inner)
    print(CircuitB_yours._depth_gates)
    print()

    print(CircuitB_yours_inner)
    print(CircuitB_yours.draw(False))
    print(CircuitB_yours)
    print("CIRCUIT INDEX", len(CircuitB_yours.gates)-1)
    # print(CircuitB_yours.gates[-1].qubits, CircuitB_yours.get_depth(len(CircuitB_yours.gates)-1), CircuitB_yours.gates[-1].flatten().depth )
    print(CircuitB_yours._depth_gates)

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