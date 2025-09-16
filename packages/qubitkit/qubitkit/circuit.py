from typing import List, Set, Dict, Union, Any
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
        # DAG helper attributes
        self._gate_dict: Dict[int, Gate] = {}
        self._gate_qubit: Dict[int, Set[int]] = {}
        self._g: Dict[int, Set[int]] = {}
        self._rg: Dict[int, Set[int]] = {}
        self._s: Set[int] = set()

    @property
    def num_gates(self) -> int:
        return len(self.gates)

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
        self._determine_parents(self.num_gates - 1)
        self._qubits_dirty, self._dependencies_dirty = True, True

    def get_parents(self, gate_idx: int) -> List[int]:
        return self.gates[gate_idx].parents if 0 <= gate_idx < self.num_gates else []

    def get_children(self, gate_idx: int) -> List[int]:
        return self.gates[gate_idx].children if 0 <= gate_idx < self.num_gates else []

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
        pass

    def clone(self):
        pass

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


# Example: Adding Circuit as a gate
if __name__ == "__main__":
    inner_circuit = Circuit(2, "inner")
    inner_circuit.add_gate(Gate("H", [0]))
    inner_circuit.add_gate(Gate("CNOT", [1], [0]))
    inner_circuit.build_dependencies()

    circuit_top = Circuit(3, "top")
    circuit_top.add_gate(Gate("X", [2]))  # Gate 0
    circuit_top.add_gate(inner_circuit) # Add circuit as a composite gate
    circuit_top.add_gate(Gate("Y", [0]))  # Gate 2
    circuit_top.build_dependencies()

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