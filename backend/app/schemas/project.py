"""
Project schemas for API requests/responses.
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from enum import Enum

class CollaboratorRole(str, Enum):
    """Collaboration role types"""
    OWNER = "owner"
    EDITOR = "editor"
    VIEWER = "viewer"

class LinkAccessLevel(str, Enum):
    """Link sharing access levels"""
    NONE = "none"
    VIEW = "view"
    EDIT = "edit"

class CircuitInfo(BaseModel):
    """Circuit information matching frontend structure"""
    id: str
    name: Optional[str] = None
    symbol: str
    color: str
    gates: List[dict] = Field(default_factory=list)

    model_config = ConfigDict(extra="ignore")

class ProjectBase(BaseModel):
    """Base project fields"""
    name: str
    description: Optional[str] = None
    circuits: List[CircuitInfo] = Field(default_factory=list)
    active_circuit_id: str = Field(alias="activeCircuitId")
    is_archived: bool = Field(default=False, alias="isArchived")

    model_config = ConfigDict(populate_by_name=True)

class ProjectCreate(ProjectBase):
    """Create new project request"""
    pass

class ProjectUpdate(BaseModel):
    """update project request - all fields optional"""
    name: Optional[str] = None
    description: Optional[str] = None
    circuits: Optional[List[CircuitInfo]] = None
    active_circuit_id: Optional[str] = Field(default=None, alias="activeCircuitId")
    is_archived: Optional[bool] = Field(default=None, alias="isArchived")

    model_config = ConfigDict(populate_by_name=True, extra="ignore")

class ProjectResponse(ProjectBase):
    """Project response with metadata"""
    id: str
    owner_id: str
    created_at: int = Field(alias="createdAt")
    updated_at: int = Field(alias="updatedAt")
    is_shared: bool = Field(default=False, alias="isShared")
    owner_email: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

class SharePermissionCreate(BaseModel):
    """Add collaborator to project"""
    user_email: str
    role: CollaboratorRole

class SharePermissionResponse(BaseModel):
    """Collaborator information"""
    id: str
    project_id: str
    user_email: str
    role: CollaboratorRole
    granted_at: int
    granted_by: str

class ShareLinkUpdate(BaseModel):
    """Update link sharing settings"""
    link_access: LinkAccessLevel

class ShareLinkResponse(BaseModel):
    """Share link information"""
    project_id: str
    link_access: LinkAccessLevel
    share_token: Optional[str] = None
    share_url: Optional[str] = None
    created_at: int
    updated_at: int

class ProjectListResponse(BaseModel):
    """List of projects with pagination"""
    projects: List[ProjectResponse]
    total: int
    page: int
    page_size: int
