"""project schemas"""
from typing import Optional, List, Dict, Union
from pydantic import BaseModel, Field
from app.models.project import (
    SimulationResults,
    SerializedGate,
)

class CircuitInfoSchema(BaseModel):
    """circuit information schema"""
    id: str
    name: str
    numQubits: int
    gates: List[SerializedGate] = []
    tags: List[str] = []
    metadata: Optional[Dict[str, Union[str, int, float, bool]]] = None
    results: Optional[SimulationResults] = None

class ProjectCreate(BaseModel):
    """schema for creating project"""
    name: str
    description: Optional[str] = None
    circuits: List[CircuitInfoSchema] = []
    active_circuit_id: str = Field(..., alias="activeCircuitId")
    class Config:
        populate_by_name = True

class ProjectUpdate(BaseModel):
    """schema for updating project"""
    name: Optional[str] = None
    description: Optional[str] = None
    circuits: Optional[List[CircuitInfoSchema]] = None
    active_circuit_id: Optional[str] = Field(None, alias="activeCircuitId")
    class Config:
        populate_by_name = True

class ProjectResponse(BaseModel):
    """schema for project response"""
    id: str
    name: str
    description: Optional[str] = None
    circuits: List[CircuitInfoSchema] = []
    activeCircuitId: str
    createdAt: int
    updatedAt: int
