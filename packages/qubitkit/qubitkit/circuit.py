from typing import List, Set, Dict, Union, Any
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
        self._depth: int = 0
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
        if not self._depth_dirty:
            return self._depth
        n = self.num_gates_flat
        gates_depth = [0] * n
        gates_visited = [False] * n
        def dfs(gate_idx: int) -> None:
            gates_visited[gate_idx] = True
            for child_idx in self.gates[gate_idx].children:
                if not gates_visited[child_idx]:
                    dfs(child_idx)
                gates_depth[gate_idx] = max(gates_depth[gate_idx], 1 + gates_depth[child_idx])

        for i in range(n):
            if not gates_visited[i]:
                dfs(i)

        self._depth = max(gates_depth) + 1 if gates_depth else 0
        self._depth_dirty = False
        return self._depth

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
        self.gates.append(gate)
        self._determine_parents(self.num_gates_flat - 1)
        self._qubits_dirty, self._dependencies_dirty, self._depth_dirty = True, True, True

    def get_depth(self, gate_idx: int) -> int:
        gate = self.gates[gate_idx]
        return 1 + max(self.get_depth(p_idx) for p_idx in gate.parents) if gate.parents else 1

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

    def flatten(self):
        flat_circuit = Circuit(
            self.num_qubits,
            f"{self.name}_flat",
            self.source_library
        )
        for gate in self.gates:
            if isinstance(gate, Circuit):
                flat_circuit_inner = gate.flatten()
                for gate in flat_circuit_inner.gates:
                    flat_circuit.add_gate(gate.clone())
            else:
                flat_circuit.add_gate(gate.clone())
        flat_circuit.metadata = self.metadata.copy()
        return flat_circuit

    def clone(self):
        new_circuit = Circuit(
            self.num_qubits,
            f"{self.name}_clone",
            self.source_library
        )
        for gate in self.gates:
            new_circuit.add_gate(gate.clone())
        new_circuit.metadata = copy.deepcopy(self.metadata)
        return new_circuit

    def draw(self, show_depth: bool = True) -> str:
        # get gate width including sub-circuit borders
        def get_gate_width(gate):
            return len(gate.name) + (2 if isinstance(gate, Circuit) else 0)
        def get_gate_position(gate_idx, gate):
            if show_depth:
                depth = self.get_depth(gate_idx)
                name_width = depth_widths[depth]
                col = sum(depth_widths[d] + 1 for d in range(1, depth)) if depth > 1 else 0
            else:
                name_width = max(1, get_gate_width(gate))
                col = sum(max(1, get_gate_width(g)) + 1 for g in self.gates[:gate_idx])
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
                top_qubit = min(control, gate.target_qubits[0])
                bottom_qubit = max(control, gate.target_qubits[0])
                lines[control][col_center] = "●"
                for qubit in range(top_qubit, bottom_qubit + 1):
                    if qubit not in gate.qubits:
                        draw_preserving_controls(lines[qubit], col_center,"│")
        def draw_sub_circuit(gate_idx, gate):
            col, name_width = get_gate_position(gate_idx, gate)
            involved_qubits = sorted(gate.qubits)
            if len(involved_qubits) == 1:
                # single qubit sub-circuit
                qubit = involved_qubits[0]
                content = f"┌{gate.name}┐"
                draw_preserving_controls(lines[qubit], col, content.ljust(name_width, "─"))
            else:
                # multi-qubit sub-circuit
                for j, qubit in enumerate(involved_qubits):
                    if j == 0:
                        # top line
                        content = f"┌{gate.name.center(name_width - 2, '─')}┐"
                        draw_preserving_controls(lines[qubit], col, content)
                    elif j == len(involved_qubits) - 1:
                        # bottom line
                        content = f"└{'─' * (name_width - 2)}┘"
                        draw_preserving_controls(lines[qubit], col, content)
                    else:
                        # middle lines
                        content = f"│{' ' * (name_width - 2)}│"
                        draw_preserving_controls(lines[qubit], col, content)

        # calculate widths and columns
        if show_depth:
            depth_widths = {}
            for i, gate in enumerate(self.gates):
                depth = self.get_depth(i)
                depth_widths[depth] = max(depth_widths.get(depth, 0), get_gate_width(gate)) # get maximum width
            cols = sum(width + 1 for width in depth_widths.values()) - 1  # no padding on the last
        else:
            cols = sum(max(1, get_gate_width(gate)) + 1 for gate in self.gates) - 1

        lines = [["─"] * cols for _ in range(self.num_qubits)]

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
        return  f"{self.name}({self.num_qubits})"

    def __str__(self):
        return self.draw(show_depth=False)

# Example: Adding Circuit as a gate
if __name__ == "__main__":
    inner_circuit = Circuit(3, "inner")
    inner_circuit.add_gate(Gate("H", [0]))
    inner_circuit.add_gate(Gate("CNOT", [2], [0]))
    inner_circuit.build_dependencies()

    circuit_top = Circuit(3, "top")
    circuit_top.add_gate(Gate("X", [2]))  # Gate 0
    circuit_top.add_gate(inner_circuit) # Add circuit as a composite gate
    circuit_top.add_gate(Gate("Y", [0]))  # Gate 2
    circuit_top.build_dependencies()

    circuit_top_2 = Circuit(3, "top_2")
    circuit_top_2.add_gate(Gate("X", [1]))  # Gate 0
    circuit_top_2.add_gate(inner_circuit) # Add circuit as a composite gate
    circuit_top_2.add_gate(Gate("Y", [0]))  # Gate 2
    circuit_top_2.build_dependencies()

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

    CircuitB.add_gate(circuit_top)

    CircuitB.add_gate(circuit_top_2)

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
