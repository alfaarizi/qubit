from abc import ABC, abstractmethod
from typing import List, Set

class Operation(ABC):
    def __init__(self):
        self.name: str = ""
        # DAG info
        # self.depth: int = 0
        self.parents: List[int] = []
        self.children: List[int] = []
        self.partition_id: int = -1
        self.source_library: str = ""

    @property
    @abstractmethod
    def num_qubits(self) -> int:
        ...

    @num_qubits.setter
    @abstractmethod
    def num_qubits(self, value) -> int:
        ...

    @property
    @abstractmethod
    def qubits(self) -> Set[int]:
        ...