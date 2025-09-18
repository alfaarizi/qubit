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

    @property
    def num_gates_flat(self) -> int:
        return len(self.gates)

    @property
    def depth(self) -> int:
        """
        The time it takes to execute the circuit
        :return: the longest path in a DAG
        """
        if not self.gates:
            return 0
        return max(self.get_depth(i) for i in range(len(self.gates)))

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
        self._qubits_dirty, self._dependencies_dirty, self._depth_dirty = True, True, True

    def get_depth(self, gate_idx: int) -> int:
        if gate_idx >= self.num_gates_flat or gate_idx < 0:
            raise IndexError(f"gate index {gate_idx} out of bounds")

        gate_depths_len = len(self._gate_depths)
        while gate_depths_len <= gate_idx:
            self._gate_depths.append(None)
            gate_depths_len += 1

        if self._gate_depths[gate_idx] is not None:
            return self._gate_depths[gate_idx]

        gate = self.gates[gate_idx]
        gate_depth = 1 + max(self.get_depth(p_idx) for p_idx in gate.parents) if gate.parents else 1

        self._gate_depths[gate_idx] = gate_depth
        if gate_depth not in self._depth_gates:
            self._depth_gates[gate_depth] = []
        self._depth_gates[gate_depth].append(gate_idx)

        return gate_depth

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
        def get_gate_width(gate):
            return len(gate.name) + (2 if isinstance(gate, Circuit) else 0)
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
        return self.draw(show_depth=False)

# Example: Adding Circuit as a gate
if __name__ == "__main__":
    inner_circuit = Circuit(3, "inner")
    inner_circuit.add_gate(Gate("H", [0]))
    inner_circuit.add_gate(Gate("CNOT", [2], [0]))
    inner_circuit.build_dependencies()
    inner_circuit.validate_dependencies()  # Should pass

    circuit_top = Circuit(3, "top")
    circuit_top.add_gate(Gate("X", [2]))  # Gate 0
    circuit_top.add_gate(inner_circuit) # Add circuit as a composite gate
    circuit_top.add_gate(Gate("Y", [0]))  # Gate 2
    inner_circuit.build_dependencies()
    circuit_top.validate_dependencies()  # Should pass

    circuit_top_2 = Circuit(3, "top_2")
    circuit_top_2.add_gate(Gate("X", [1]))  # Gate 0
    circuit_top_2.add_gate(Gate("X", [1]))  # Gate 0
    circuit_top_2.add_gate(inner_circuit) # Add circuit as a composite gate
    circuit_top_2.add_gate(Gate("Y", [0]))  # Gate 2
    inner_circuit.build_dependencies()
    circuit_top_2.validate_dependencies()  # Should pass

    print("\n=== Checking circuit_top ===")
    print(f"Circuit depth: {circuit_top.depth}")
    print(f"Gate dict: {dict(circuit_top._gate_dict)}")
    print(f"Gate qubit: {dict(circuit_top._gate_qubit)}")
    print(f"Forward graph: {dict(circuit_top._g)}")
    print(f"Reverse graph: {dict(circuit_top._rg)}")
    print(f"Starting gates: {circuit_top._s}")
    for gi in range(len(circuit_top.gates)):
        parents = circuit_top.get_parents(gi)
        children = circuit_top.get_children(gi)
        gate_name = circuit_top.gates[gi].name
        print(f"Gate {gi} ({gate_name}): parents = {parents}, children = {children}")

    print("\n=== Checking inner_circuit ===")
    print(f"Circuit depth: {inner_circuit.depth}")
    print(f"Gate dict: {dict(inner_circuit._gate_dict)}")
    print(f"Gate qubit: {dict(inner_circuit._gate_qubit)}")
    print(f"Forward graph: {dict(inner_circuit._g)}")
    print(f"Reverse graph: {dict(inner_circuit._rg)}")
    print(f"Starting gates: {inner_circuit._s}")
    for gi in range(len(inner_circuit.gates)):
        parents = inner_circuit.get_parents(gi)
        children = inner_circuit.get_children(gi)
        gate_name = inner_circuit.gates[gi].name
        print(f"Gate {gi} ({gate_name}): parents = {parents}, children = {children}")

    print("\n=== THE MOMENT TOP CIRCUIT TRUTH ===")
    print([circuit_top.gates[parent] for parent in circuit_top.gates[1].parents])
    print([circuit_top.gates[child] for child in circuit_top.gates[1].children])

    print("\n=== THE MOMENT INNER CIRCUIT TRUTH ===")
    print([inner_circuit.gates[parent] for parent in inner_circuit.gates[1].parents])
    print([inner_circuit.gates[child] for child in inner_circuit.gates[1].children])

    # https://quantum.cloud.ibm.com/docs/en/api/qiskit/0.42/qiskit.circuit.QuantumCircuit
    CircuitB = Circuit(12, "tetris")
    CircuitB.add_gate(Gate("H", [0]))
    CircuitB.add_gate(Gate("H", [1]))
    CircuitB.add_gate(Gate("H", [2]))
    CircuitB.add_gate(Gate("H", [3]))
    CircuitB.add_gate(Gate("H", [4]))

    CircuitB.add_gate(Gate("CNOT", [0], [5]))
    CircuitB.add_gate(Gate("CNOT", [1], [6]))
    CircuitB.add_gate(Gate("CNOT", [2], [7]))
    CircuitB.add_gate(Gate("CNOT", [3], [8]))
    CircuitB.add_gate(Gate("CNOT", [4], [9]))

    CircuitB.add_gate(Gate("CNOT", [1], [7]))
    CircuitB.add_gate(Gate("X", [8]))

    CircuitB.add_gate(Gate("CNOT", [1], [9]))
    CircuitB.add_gate(Gate("H", [7]))

    CircuitB.add_gate(Gate("CNOT", [1], [11]))

    CircuitB.add_gate(Gate("XX", [6], [11]))
    CircuitB.add_gate(Gate("XX", [6], [9]))
    CircuitB.add_gate(Gate("", [6], [10]))

    CircuitB.add_gate(Gate("X", [6]))

    circuit_top_3 = Circuit(5, "top_3")
    circuit_top_3.add_gate(circuit_top)
    circuit_top_3.add_gate(circuit_top_2)

    # CircuitB.add_gate(circuit_top)

    # CircuitB.add_gate(circuit_top_2)

    CircuitB.add_gate(circuit_top_3)

    print(CircuitB.depth)

    print("Circuit Top Flatten")
    circuit_top_flat = circuit_top.flatten()
    for gate in circuit_top_flat.gates:
        print(gate)

    print(inner_circuit)
    print(inner_circuit.draw(show_depth=True))
    print(circuit_top)
    print(circuit_top.draw(show_depth=True))
    print(circuit_top_2)
    print(circuit_top_2.draw(show_depth=True))
    print(CircuitB)
    print(CircuitB.draw(show_depth=True))
    print(CircuitB.flatten(1).draw(show_depth=True))
    print(CircuitB.flatten().draw(show_depth=True))
    print(CircuitB._depth_gates)
    print(CircuitB._gate_depths)