"""project schemas"""
from typing import Optional, List, Dict, Union
from pydantic import BaseModel, Field, EmailStr
from app.models.project import (
    SimulationResults,
    SerializedGate,
    Collaborator,
    CollaboratorRole,
    ShareLink,
    ShareLinkType,
)

class CircuitInfoSchema(BaseModel):
    """circuit information schema"""
    id: str
    name: str
    numQubits: int
    gates: List[SerializedGate] = []
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

class CollaboratorSchema(BaseModel):
    """schema for collaborator"""
    userId: str
    email: str
    role: CollaboratorRole
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    profileUrl: Optional[str] = None
    addedAt: int

class ShareLinkSchema(BaseModel):
    """schema for share link"""
    token: str
    linkType: ShareLinkType
    createdAt: int
    expiresAt: Optional[int] = None
    isActive: bool

class ProjectResponse(BaseModel):
    """schema for project response"""
    id: str
    name: str
    description: Optional[str] = None
    circuits: List[CircuitInfoSchema] = []
    activeCircuitId: str
    collaborators: List[CollaboratorSchema] = []
    shareLinks: List[ShareLinkSchema] = []
    createdAt: int
    updatedAt: int
    userRole: Optional[CollaboratorRole] = None

class InviteCollaboratorRequest(BaseModel):
    """schema for inviting collaborator"""
    email: EmailStr
    role: CollaboratorRole

class UpdateCollaboratorRoleRequest(BaseModel):
    """schema for updating collaborator role"""
    role: CollaboratorRole

class GenerateShareLinkRequest(BaseModel):
    """schema for generating share link"""
    linkType: ShareLinkType

class ShareLinkResponse(BaseModel):
    """schema for share link response"""
    url: str
    token: str
    linkType: ShareLinkType
