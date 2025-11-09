"""projects api endpoints"""
from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from bson import ObjectId
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse, CollaboratorSchema, ShareLinkSchema
from app.models import Project, User
from app.models.project import CollaboratorRole, Collaborator
from app.db import get_database
from app.api.dependencies import get_current_user

router = APIRouter()

def get_user_role_in_project(project: Project, user_email: str) -> CollaboratorRole:
    """get user's role in project"""
    if project.user_id == user_email:
        return CollaboratorRole.OWNER
    for collab in project.collaborators:
        if collab.email == user_email:
            return collab.role
    return None

def project_to_response(project: Project, user_email: str) -> ProjectResponse:
    """convert project to response with user role"""
    return ProjectResponse(
        id=str(project.id),
        name=project.name,
        description=project.description,
        circuits=[c.model_dump() for c in project.circuits],
        activeCircuitId=project.active_circuit_id,
        collaborators=[
            CollaboratorSchema(
                userId=c.user_id,
                email=c.email,
                role=c.role,
                firstName=c.first_name,
                lastName=c.last_name,
                profileUrl=c.profile_url,
                addedAt=int(c.added_at.timestamp() * 1000),
            )
            for c in project.collaborators
        ],
        shareLinks=[
            ShareLinkSchema(
                token=sl.token,
                linkType=sl.link_type,
                createdAt=int(sl.created_at.timestamp() * 1000),
                expiresAt=int(sl.expires_at.timestamp() * 1000) if sl.expires_at else None,
                isActive=sl.is_active,
            )
            for sl in project.share_links
        ],
        createdAt=int(project.created_at.timestamp() * 1000),
        updatedAt=int(project.updated_at.timestamp() * 1000),
        userRole=get_user_role_in_project(project, user_email),
    )

@router.get("", response_model=List[ProjectResponse])
async def list_projects(current_user: User = Depends(get_current_user)):
    """get all projects for current user (owned + shared)"""
    db = get_database()
    # get owned projects
    owned_projects_data = db.projects.find({"user_id": current_user.email})
    # get shared projects
    shared_projects_data = db.projects.find({
        "collaborators.email": current_user.email
    })
    projects = []
    for data in owned_projects_data:
        project = Project.from_dict(data)
        projects.append(project_to_response(project, current_user.email))
    for data in shared_projects_data:
        project = Project.from_dict(data)
        # avoid duplicates if user is both owner and collaborator
        if project.user_id != current_user.email:
            projects.append(project_to_response(project, current_user.email))
    return projects

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(project_in: ProjectCreate, current_user: User = Depends(get_current_user)):
    """create new project"""
    db = get_database()
    project = Project(
        user_id=current_user.email,
        name=project_in.name,
        description=project_in.description,
        circuits=project_in.circuits,
        active_circuit_id=project_in.active_circuit_id,
        collaborators=[],
        share_links=[],
    )
    result = db.projects.insert_one(project.to_dict())
    project.id = str(result.inserted_id)
    return project_to_response(project, current_user.email)

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, current_user: User = Depends(get_current_user)):
    """get project by id (owned or shared)"""
    db = get_database()
    try:
        # check if user owns or has access to project
        project_data = db.projects.find_one({
            "_id": ObjectId(project_id),
            "$or": [
                {"user_id": current_user.email},
                {"collaborators.email": current_user.email}
            ]
        })
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="project not found")
    if not project_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="project not found")
    project = Project.from_dict(project_data)
    return project_to_response(project, current_user.email)

@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, project_update: ProjectUpdate, current_user: User = Depends(get_current_user)):
    """update project"""
    db = get_database()
    try:
        # check if user has edit access
        project_data = db.projects.find_one({
            "_id": ObjectId(project_id),
            "$or": [
                {"user_id": current_user.email},
                {"collaborators": {"$elemMatch": {"email": current_user.email, "role": {"$in": ["editor", "owner"]}}}}
            ]
        })
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="project not found")
    if not project_data:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="no permission to edit project")
    from datetime import datetime, timezone
    update_data = project_update.model_dump(exclude_unset=True, by_alias=False)
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc)
        db.projects.update_one({"_id": ObjectId(project_id)}, {"$set": update_data})
    updated_data = db.projects.find_one({"_id": ObjectId(project_id)})
    project = Project.from_dict(updated_data)
    return project_to_response(project, current_user.email)

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_id: str, current_user: User = Depends(get_current_user)):
    """delete project"""
    db = get_database()
    try:
        result = db.projects.delete_one({"_id": ObjectId(project_id), "user_id": current_user.email})
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="project not found")
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="project not found")
    return None

@router.post("/{project_id}/duplicate", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def duplicate_project(project_id: str, current_user: User = Depends(get_current_user)):
    """duplicate project"""
    db = get_database()
    try:
        # allow duplication if user has access (owner or collaborator)
        project_data = db.projects.find_one({
            "_id": ObjectId(project_id),
            "$or": [
                {"user_id": current_user.email},
                {"collaborators.email": current_user.email}
            ]
        })
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="project not found")
    if not project_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="project not found")
    original = Project.from_dict(project_data)
    new_project = Project(
        user_id=current_user.email,
        name=f"{original.name} (Copy)",
        description=original.description,
        circuits=original.circuits,
        active_circuit_id=original.active_circuit_id,
        collaborators=[],  # don't copy collaborators
        share_links=[],  # don't copy share links
    )
    result = db.projects.insert_one(new_project.to_dict())
    new_project.id = str(result.inserted_id)
    return project_to_response(new_project, current_user.email)
