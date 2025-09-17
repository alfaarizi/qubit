from enum import Enum
from typing import List, Set, Dict, Any, Optional
from interfaces import Operation
import copy

class GateType(Enum):
    SINGLE_QUBIT    = "single_qubit"
    TWO_QUBIT       = "two_qubit"
    MEASUREMENT     = "measurement"
    CUSTOM          = "custom"

class Gate(Operation):
    def __init__(
        self,
        name: str,
        target_qubits: List[int],
        control_qubits: Optional[List[int]] = None,
        parameters: Optional[Dict[str, Any]] = None
    ):
        super().__init__()
        self.name: str = name or "Gate"
        self.source_library: str = ""
        self.parameters: Dict[str, Any] = parameters or {}
        # private
        self._target_qubits: List[int] = target_qubits
        self._control_qubits: List[int] = control_qubits or []
        self._num_qubits: int = len(set(self._target_qubits + self._control_qubits))
        self._qubits: Set[int] = set()
        # determining gate type
        self.gate_type = (
            GateType.MEASUREMENT if "measure" in name.lower() else
            GateType.SINGLE_QUBIT if self._num_qubits == 1 else
            GateType.TWO_QUBIT if self._num_qubits == 2 else
            GateType.CUSTOM
        )

    @property
    def num_qubits(self) -> int:
        return self._num_qubits

    @num_qubits.setter
    def num_qubits(self, value: int):
        if self._target_qubits and value <= max(self._target_qubits):
            raise ValueError(f"Number of qubits ({value}) is too small, conflicts with target qubits {self._target_qubits}")
        if self._control_qubits and value <= max(self._control_qubits):
            raise ValueError(f"Number of qubits ({value}) is too small, conflicts with control qubits {self._control_qubits}")
        self._num_qubits = value

    @property
    def qubits(self) -> Set[int]:
        self._qubits.clear()
        self._qubits.update(self._target_qubits, self._control_qubits)
        return self._qubits

    @property
    def target_qubits(self) -> List[int]:
        return self._target_qubits

    @target_qubits.setter
    def target_qubits(self, value: List[int]):
        for qbit in value:
            if qbit >= self._num_qubits:
                raise IndexError(f"Target qubit index {qbit} out of bounds for {self._num_qubits}-qubit Gate")
        self._target_qubits = value

    @property
    def control_qubits(self) -> List[int]:
        return self._control_qubits

    @control_qubits.setter
    def control_qubits(self, value: List[int]):
        for qbit in value:
            if qbit >= self._num_qubits:
                raise IndexError(f"Control qubit index {qbit} out of bounds for {self._num_qubits}-qubit Gate")
        self._control_qubits = value

    def clone(self) -> 'Gate':
        new_gate = Gate(
            self.name,
            self.target_qubits.copy(),
            self.control_qubits.copy() if self.control_qubits else None,
            copy.deepcopy(self.parameters)
        )
        new_gate.num_qubits = self.num_qubits
        new_gate.source_library = self.source_library
        return new_gate


    def __eq__(self, other):
        if not isinstance(other, Gate):
            return False
        return (
            self.name == other.name and
            self.target_qubits == other.target_qubits and
            self.control_qubits == other.control_qubits and
            self.parameters == other.parameters
        )

    def __hash__(self) -> int:
        return hash((
            self.name,
            tuple(self.target_qubits),
            tuple(self.control_qubits),
            tuple(sorted(self.parameters.items()))
        ))

    def __repr__(self) -> str:
        return  f"{self.name}({self.target_qubits}, {self._control_qubits})"

    def __str__(self) -> str:
        if self.gate_type == GateType.MEASUREMENT:
            qubits = ", ".join(f"q[{i}]" for i in self.target_qubits)
            return f"measure {qubits}"
        params = f"({','.join(map(str, self.parameters.values()))})" if self.parameters else ""
        qubits = ", ".join(f"q[{i}]" for i in self.control_qubits+self.target_qubits)
        return f"{self.name}{params} {qubits};"
