"""collaboration api endpoints"""
from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import Optional
from bson import ObjectId
import secrets
from datetime import datetime, timezone

from app.schemas.project import (
    InviteCollaboratorRequest,
    UpdateCollaboratorRoleRequest,
    GenerateShareLinkRequest,
    ShareLinkResponse,
    ProjectResponse,
)
from app.models import Project, User
from app.models.project import Collaborator, CollaboratorRole, ShareLink, ShareLinkType
from app.db import get_database
from app.api.dependencies import get_current_user
from app.api.v1.endpoints.projects import project_to_response, get_user_role_in_project
from app.core.config import settings

router = APIRouter()

def check_owner_permission(project: Project, user_email: str):
    """check if user is project owner"""
    if project.user_id != user_email:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="only project owner can perform this action"
        )

def check_edit_permission(project: Project, user_email: str):
    """check if user has edit permission"""
    role = get_user_role_in_project(project, user_email)
    if role not in [CollaboratorRole.OWNER, CollaboratorRole.EDITOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="no permission to edit this project"
        )

@router.post("/{project_id}/collaborators", response_model=ProjectResponse)
async def invite_collaborator(
    project_id: str,
    invite_request: InviteCollaboratorRequest,
    current_user: User = Depends(get_current_user),
):
    """invite collaborator to project (owner only)"""
    db = get_database()
    try:
        project_data = db.projects.find_one({"_id": ObjectId(project_id)})
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="project not found")
    if not project_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="project not found")
    project = Project.from_dict(project_data)
    check_owner_permission(project, current_user.email)
    # check if user being invited exists
    invited_user_data = db.users.find_one({"email": invite_request.email})
    if not invited_user_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"user with email {invite_request.email} not found"
        )
    invited_user = User.from_dict(invited_user_data)
    # check if already collaborator
    for collab in project.collaborators:
        if collab.email == invite_request.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="user is already a collaborator"
            )
    # check if inviting owner
    if invite_request.email == project.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="cannot invite project owner as collaborator"
        )
    # create collaborator
    new_collaborator = Collaborator(
        user_id=str(invited_user_data["_id"]),
        email=invited_user.email,
        role=invite_request.role,
        first_name=invited_user.first_name,
        last_name=invited_user.last_name,
        profile_url=invited_user.profile_url,
    )
    # add to project
    db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {
            "$push": {"collaborators": new_collaborator.model_dump()},
            "$set": {"updated_at": datetime.now(timezone.utc)}
        }
    )
    
    # return updated project
    updated_data = db.projects.find_one({"_id": ObjectId(project_id)})
    updated_project = Project.from_dict(updated_data)
    return project_to_response(updated_project, current_user.email)


@router.put("/{project_id}/collaborators/{collaborator_email}", response_model=ProjectResponse)
async def update_collaborator_role(
    project_id: str,
    collaborator_email: str,
    update_request: UpdateCollaboratorRoleRequest,
    current_user: User = Depends(get_current_user),
):
    """update collaborator role (owner only)"""
    db = get_database()
    try:
        project_data = db.projects.find_one({"_id": ObjectId(project_id)})
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="project not found")
    if not project_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="project not found")
    project = Project.from_dict(project_data)
    check_owner_permission(project, current_user.email)
    # check if collaborator exists
    collaborator_found = False
    for collab in project.collaborators:
        if collab.email == collaborator_email:
            collaborator_found = True
            break
    if not collaborator_found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="collaborator not found"
        )
    # update role
    db.projects.update_one(
        {
            "_id": ObjectId(project_id),
            "collaborators.email": collaborator_email
        },
        {
            "$set": {
                "collaborators.$.role": update_request.role.value,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    # return updated project
    updated_data = db.projects.find_one({"_id": ObjectId(project_id)})
    updated_project = Project.from_dict(updated_data)
    return project_to_response(updated_project, current_user.email)

@router.delete("/{project_id}/collaborators/{collaborator_email}", response_model=ProjectResponse)
async def remove_collaborator(
    project_id: str,
    collaborator_email: str,
    current_user: User = Depends(get_current_user),
):
    """remove collaborator from project (owner only)"""
    db = get_database()
    try:
        project_data = db.projects.find_one({"_id": ObjectId(project_id)})
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="project not found")
    if not project_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="project not found")
    project = Project.from_dict(project_data)
    check_owner_permission(project, current_user.email)
    # remove collaborator
    result = db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {
            "$pull": {"collaborators": {"email": collaborator_email}},
            "$set": {"updated_at": datetime.now(timezone.utc)}
        }
    )
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="collaborator not found"
        )
    # return updated project
    updated_data = db.projects.find_one({"_id": ObjectId(project_id)})
    updated_project = Project.from_dict(updated_data)
    return project_to_response(updated_project, current_user.email)

@router.post("/{project_id}/share-links", response_model=ShareLinkResponse)
async def generate_share_link(
    project_id: str,
    link_request: GenerateShareLinkRequest,
    current_user: User = Depends(get_current_user),
):
    """generate shareable link (owner only)"""
    db = get_database()
    try:
        project_data = db.projects.find_one({"_id": ObjectId(project_id)})
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="project not found")
    if not project_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="project not found")
    project = Project.from_dict(project_data)
    check_owner_permission(project, current_user.email)
    # check if link type already exists and is active
    for link in project.share_links:
        if link.link_type == link_request.linkType and link.is_active:
            # return existing active link
            return ShareLinkResponse(
                url=f"{settings.FRONTEND_URL}/project/{project_id}?share_token={link.token}",
                token=link.token,
                linkType=link.link_type,
            )
    # generate new token
    token = secrets.token_urlsafe(32)
    new_link = ShareLink(
        token=token,
        link_type=link_request.linkType,
    )
    # add to project
    db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {
            "$push": {"share_links": new_link.model_dump()},
            "$set": {"updated_at": datetime.now(timezone.utc)}
        }
    )
    return ShareLinkResponse(
        url=f"{settings.FRONTEND_URL}/project/{project_id}?share_token={token}",
        token=token,
        linkType=link_request.linkType,
    )

@router.delete("/{project_id}/share-links/{token}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_share_link(
    project_id: str,
    token: str,
    current_user: User = Depends(get_current_user),
):
    """revoke shareable link (owner only)"""
    db = get_database()
    try:
        project_data = db.projects.find_one({"_id": ObjectId(project_id)})
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="project not found")
    if not project_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="project not found")
    project = Project.from_dict(project_data)
    check_owner_permission(project, current_user.email)
    # deactivate link
    result = db.projects.update_one(
        {
            "_id": ObjectId(project_id),
            "share_links.token": token
        },
        {
            "$set": {
                "share_links.$.is_active": False,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="share link not found"
        )
    return None

@router.get("/join", response_model=ProjectResponse)
async def join_via_share_link(
    share_token: str = Query(..., description="Share link token"),
    project_id: str = Query(..., description="Project ID"),
    current_user: User = Depends(get_current_user),
):
    """join project via share link"""
    db = get_database()
    try:
        project_data = db.projects.find_one({"_id": ObjectId(project_id)})
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="project not found")
    if not project_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="project not found")
    project = Project.from_dict(project_data)
    # find share link
    share_link = None
    for link in project.share_links:
        if link.token == share_token and link.is_active:
            share_link = link
            break
    if not share_link:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="invalid or expired share link"
        )
    # check if user is already owner or collaborator
    if project.user_id == current_user.email:
        # already owner, just return project
        return project_to_response(project, current_user.email)
    for collab in project.collaborators:
        if collab.email == current_user.email:
            # already collaborator, just return project
            return project_to_response(project, current_user.email)
    # determine role based on link type
    role = CollaboratorRole.EDITOR if share_link.link_type == ShareLinkType.EDIT else CollaboratorRole.VIEWER
    # get current user info
    user_data = db.users.find_one({"email": current_user.email})
    # add as collaborator
    new_collaborator = Collaborator(
        user_id=str(user_data["_id"]),
        email=current_user.email,
        role=role,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        profile_url=current_user.profile_url,
    )
    db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {
            "$push": {"collaborators": new_collaborator.model_dump()},
            "$set": {"updated_at": datetime.now(timezone.utc)}
        }
    )
    # return updated project
    updated_data = db.projects.find_one({"_id": ObjectId(project_id)})
    updated_project = Project.from_dict(updated_data)
    return project_to_response(updated_project, current_user.email)

