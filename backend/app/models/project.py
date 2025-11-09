"""project model for MongoDB"""
from typing import Optional, List, Dict, Union
from datetime import datetime, timezone
from bson import ObjectId
from pydantic import BaseModel, Field
from enum import Enum

class CollaboratorRole(str, Enum):
    """collaborator role enum"""
    OWNER = "owner"
    EDITOR = "editor"
    VIEWER = "viewer"

class Collaborator(BaseModel):
    """collaborator information"""
    user_id: str
    email: str
    role: CollaboratorRole
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    profile_url: Optional[str] = None
    added_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ShareLinkType(str, Enum):
    """share link type enum"""
    EDIT = "edit"
    VIEW = "view"

class ShareLink(BaseModel):
    """shareable link information"""
    token: str
    link_type: ShareLinkType
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: Optional[datetime] = None
    is_active: bool = True

class PartitionGate(BaseModel):
    """gate in a partition"""
    id: str
    name: str
    target_qubits: List[int]
    control_qubits: List[int]

class Partition(BaseModel):
    """partition information"""
    index: int
    num_gates: int
    qubits: List[int]
    num_qubits: int
    gates: List[PartitionGate]

class PartitionInfo(BaseModel):
    """partition information"""
    strategy: str
    max_partition_size: int
    total_partitions: int
    partitions: List[Partition]

class DensityMatrix(BaseModel):
    """density matrix"""
    real: Optional[List[List[float]]] = None
    imag: Optional[List[List[float]]] = None

class EntropyScaling(BaseModel):
    """entropy scaling data"""
    subsystem_size: int
    entropy: float

class QuantumState(BaseModel):
    """quantum state data"""
    state_vector: Optional[List[List[float]]] = None
    probabilities: Optional[List[float]] = None
    counts: Optional[Dict[str, int]] = None
    density_matrix: Optional[DensityMatrix] = None
    entropy_scaling: Optional[List[EntropyScaling]] = None
    unitary: Optional[List[List[float]]] = None

class SimulationComparison(BaseModel):
    """comparison between original and partitioned"""
    fidelity: Optional[float] = None
    probability_difference: Optional[List[float]] = None
    max_difference: Optional[float] = None

class SimulationError(BaseModel):
    """simulation error"""
    stage: str
    error: str
    timeout: Optional[bool] = None

class SimulationResults(BaseModel):
    """simulation results for a circuit"""
    num_qubits: Optional[int] = None
    num_shots: Optional[int] = None
    errors: Optional[List[SimulationError]] = None
    partition_info: Optional[PartitionInfo] = None
    original: Optional[QuantumState] = None
    partitioned: Optional[QuantumState] = None
    comparison: Optional[SimulationComparison] = None
    timestamp: Optional[int] = None

class GateDefinition(BaseModel):
    """gate definition"""
    name: str

class SerializedCircuit(BaseModel):
    """serialized circuit"""
    id: str
    symbol: str
    gates: List["SerializedGate"]

class SerializedGate(BaseModel):
    """serialized gate matching frontend structure"""
    id: str
    depth: int
    gate: Optional[GateDefinition] = None
    circuit: Optional[SerializedCircuit] = None
    target_qubits: Optional[List[int]] = None
    control_qubits: Optional[List[int]] = None
    start_qubit: Optional[int] = None
    parameters: Optional[List[float]] = None

class CircuitInfo(BaseModel):
    """circuit information"""
    id: str
    name: str
    numQubits: int
    gates: List[SerializedGate] = []
    metadata: Optional[Dict[str, Union[str, int, float, bool]]] = None
    results: Optional[SimulationResults] = None

class Project(BaseModel):
    """project model"""
    id: Optional[str] = Field(None, alias="_id")
    user_id: str
    name: str
    description: Optional[str] = None
    circuits: List[CircuitInfo] = []
    active_circuit_id: str
    collaborators: List[Collaborator] = []
    share_links: List[ShareLink] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str, datetime: lambda v: v.isoformat()}
    def to_dict(self) -> dict:
        """convert to dictionary for MongoDB"""
        data = self.model_dump(by_alias=True, exclude_unset=True)
        if self.id:
            data["_id"] = ObjectId(self.id)
        else:
            data.pop("_id", None)
        data["user_id"] = self.user_id
        data["created_at"] = self.created_at
        data["updated_at"] = self.updated_at
        return data
    @classmethod
    def from_dict(cls, data: dict) -> "Project":
        """create from MongoDB document"""
        if "_id" in data:
            data["_id"] = str(data["_id"])
        return cls(**data)
