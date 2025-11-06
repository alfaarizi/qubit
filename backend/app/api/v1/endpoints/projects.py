"""
projects API endpoints - CRUD operations and sharing
"""
from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from datetime import datetime
import secrets
from bson import ObjectId

from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectListResponse,
    SharePermissionCreate,
    SharePermissionResponse,
    ShareLinkUpdate,
    ShareLinkResponse,
    CollaboratorRole,
    LinkAccessLevel,
)
from app.db.mongodb import (
    get_projects_collection,
    get_project_shares_collection,
    get_collaborators_collection,
)
from app.core.deps import get_current_user_email, get_optional_user_email

router = APIRouter()


@router.get("/", response_model=ProjectListResponse)
async def list_projects(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    include_archived: bool = Query(False),
    include_shared: bool = Query(True),
    user_id: str = Depends(get_current_user_email),
):
    """List all projects for the current user"""
    collection = get_projects_collection()

    # Build query
    query = {"owner_id": user_id}
    if not include_archived:
        query["is_archived"] = {"$ne": True}

    # Get total count
    total = await collection.count_documents(query)

    # Get paginated results
    skip = (page - 1) * page_size
    cursor = collection.find(query).sort("updated_at", -1).skip(skip).limit(page_size)

    projects = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        projects.append(ProjectResponse(**doc))

    # TODO: Add shared projects if include_shared is True

    return ProjectListResponse(
        projects=projects,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project: ProjectCreate,
    user_id: str = Depends(get_current_user_email),
    user_email: str = Depends(get_current_user_email),
):
    """Create a new project"""
    collection = get_projects_collection()

    now = int(datetime.utcnow().timestamp() * 1000)
    project_dict = project.model_dump(by_alias=False)

    project_doc = {
        **project_dict,
        "owner_id": user_id,
        "owner_email": user_email,
        "created_at": now,
        "updated_at": now,
        "is_shared": False,
    }

    result = await collection.insert_one(project_doc)
    project_doc["id"] = str(result.inserted_id)

    return ProjectResponse(**project_doc)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    user_id: str = Depends(get_current_user_email),
):
    """Get a specific project by ID"""
    collection = get_projects_collection()

    # Convert string ID to ObjectId
    try:
        obj_id = ObjectId(project_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Invalid project ID")

    project = await collection.find_one({"_id": obj_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check if user has access (owner or collaborator)
    if project["owner_id"] != user_id:
        # Check if user is a collaborator
        collab_collection = get_collaborators_collection()
        collab = await collab_collection.find_one({
            "project_id": project_id,
            "user_email": user_id,
        })
        if not collab:
            raise HTTPException(status_code=403, detail="Access denied")

    project["id"] = str(project["_id"])
    return ProjectResponse(**project)


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    project_update: ProjectUpdate,
    user_id: str = Depends(get_current_user_email),
):
    """Update a project"""
    collection = get_projects_collection()

    # Convert string ID to ObjectId
    try:
        obj_id = ObjectId(project_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Invalid project ID")

    # Check if project exists and user has permission
    existing = await collection.find_one({"_id": obj_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    if existing["owner_id"] != user_id:
        # Check if user is an editor
        collab_collection = get_collaborators_collection()
        collab = await collab_collection.find_one({
            "project_id": project_id,
            "user_email": user_id,
            "role": {"$in": [CollaboratorRole.OWNER, CollaboratorRole.EDITOR]},
        })
        if not collab:
            raise HTTPException(status_code=403, detail="Access denied")

    # Update project
    update_dict = project_update.model_dump(by_alias=False, exclude_unset=True)
    update_dict["updated_at"] = int(datetime.utcnow().timestamp() * 1000)

    await collection.update_one(
        {"_id": obj_id},
        {"$set": update_dict}
    )

    updated_project = await collection.find_one({"_id": obj_id})
    updated_project["id"] = str(updated_project["_id"])

    return ProjectResponse(**updated_project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    user_id: str = Depends(get_current_user_email),
):
    """Delete a project (owner only)"""
    collection = get_projects_collection()

    # Convert string ID to ObjectId
    try:
        obj_id = ObjectId(project_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Invalid project ID")

    project = await collection.find_one({"_id": obj_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project["owner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only owner can delete project")

    await collection.delete_one({"_id": obj_id})

    # Also delete all shares and collaborators
    await get_project_shares_collection().delete_many({"project_id": project_id})
    await get_collaborators_collection().delete_many({"project_id": project_id})


@router.delete("/", status_code=status.HTTP_200_OK)
async def delete_all_projects(
    user_id: str = Depends(get_current_user_email),
):
    """Delete ALL projects for the current user (use with caution)"""
    projects_collection = get_projects_collection()

    # Get all project IDs for this user
    cursor = projects_collection.find({"owner_id": user_id}, {"_id": 1})
    project_ids = [doc["_id"] async for doc in cursor]

    # Delete all projects
    result = await projects_collection.delete_many({"owner_id": user_id})

    # Delete all related shares and collaborators
    if project_ids:
        await get_project_shares_collection().delete_many({"project_id": {"$in": project_ids}})
        await get_collaborators_collection().delete_many({"project_id": {"$in": project_ids}})

    return {"deleted_count": result.deleted_count}


@router.post("/{project_id}/collaborators", response_model=SharePermissionResponse)
async def add_collaborator(
    project_id: str,
    permission: SharePermissionCreate,
    user_id: str = Depends(get_current_user_email),
    user_email: str = Depends(get_current_user_email),
):
    """Add a collaborator to a project"""
    # Verify user owns the project
    projects_collection = get_projects_collection()
    project = await projects_collection.find_one({"_id": project_id})

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project["owner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only owner can add collaborators")

    # Add collaborator
    collab_collection = get_collaborators_collection()
    now = int(datetime.utcnow().timestamp() * 1000)

    collab_doc = {
        "_id": secrets.token_urlsafe(16),
        "project_id": project_id,
        "user_email": permission.user_email,
        "role": permission.role,
        "granted_at": now,
        "granted_by": user_email,
    }

    await collab_collection.insert_one(collab_doc)

    # Mark project as shared
    await projects_collection.update_one(
        {"_id": project_id},
        {"$set": {"is_shared": True}}
    )

    collab_doc["id"] = collab_doc["_id"]
    return SharePermissionResponse(**collab_doc)


@router.get("/{project_id}/collaborators", response_model=List[SharePermissionResponse])
async def list_collaborators(
    project_id: str,
    user_id: str = Depends(get_current_user_email),
):
    """List all collaborators for a project"""
    # Verify user has access to project
    projects_collection = get_projects_collection()
    project = await projects_collection.find_one({"_id": project_id})

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project["owner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Get collaborators
    collab_collection = get_collaborators_collection()
    cursor = collab_collection.find({"project_id": project_id})

    collaborators = []
    async for doc in cursor:
        doc["id"] = doc["_id"]
        collaborators.append(SharePermissionResponse(**doc))

    return collaborators


@router.delete("/{project_id}/collaborators/{collaborator_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_collaborator(
    project_id: str,
    collaborator_id: str,
    user_id: str = Depends(get_current_user_email),
):
    """Remove a collaborator from a project"""
    # Verify user owns the project
    projects_collection = get_projects_collection()
    project = await projects_collection.find_one({"_id": project_id})

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project["owner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only owner can remove collaborators")

    # Remove collaborator
    collab_collection = get_collaborators_collection()
    result = await collab_collection.delete_one({"_id": collaborator_id, "project_id": project_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Collaborator not found")


@router.put("/{project_id}/share-link", response_model=ShareLinkResponse)
async def update_share_link(
    project_id: str,
    link_update: ShareLinkUpdate,
    user_id: str = Depends(get_current_user_email),
):
    """Update share link settings for a project"""
    # Verify user owns the project
    projects_collection = get_projects_collection()
    project = await projects_collection.find_one({"_id": project_id})

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project["owner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only owner can modify share settings")

    # Get or create share link settings
    shares_collection = get_project_shares_collection()
    now = int(datetime.utcnow().timestamp() * 1000)

    share_doc = await shares_collection.find_one({"project_id": project_id})

    if share_doc:
        # Update existing
        await shares_collection.update_one(
            {"project_id": project_id},
            {"$set": {
                "link_access": link_update.link_access,
                "updated_at": now,
            }}
        )
        share_doc = await shares_collection.find_one({"project_id": project_id})
    else:
        # Create new
        share_token = secrets.token_urlsafe(32) if link_update.link_access != LinkAccessLevel.NONE else None
        share_doc = {
            "project_id": project_id,
            "link_access": link_update.link_access,
            "share_token": share_token,
            "created_at": now,
            "updated_at": now,
        }
        await shares_collection.insert_one(share_doc)

    # Generate share URL if token exists
    share_url = None
    if share_doc.get("share_token"):
        # TODO: Use actual domain from config
        share_url = f"http://localhost:3002/project/{project_id}?token={share_doc['share_token']}"

    return ShareLinkResponse(
        project_id=project_id,
        link_access=share_doc["link_access"],
        share_token=share_doc.get("share_token"),
        share_url=share_url,
        created_at=share_doc["created_at"],
        updated_at=share_doc["updated_at"],
    )


@router.get("/{project_id}/share-link", response_model=ShareLinkResponse)
async def get_share_link(
    project_id: str,
    user_id: str = Depends(get_current_user_email),
):
    """get share link settings for a project"""
    projects_collection = get_projects_collection()
    project = await projects_collection.find_one({"_id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project["owner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    shares_collection = get_project_shares_collection()
    share_doc = await shares_collection.find_one({"project_id": project_id})

    if not share_doc:
        now = int(datetime.utcnow().timestamp() * 1000)
        return ShareLinkResponse(
            project_id=project_id,
            link_access=LinkAccessLevel.NONE,
            share_token=None,
            share_url=None,
            created_at=now,
            updated_at=now,
        )

    share_url = None
    if share_doc.get("share_token"):
        share_url = f"http://localhost:3002/project/{project_id}?token={share_doc['share_token']}"

    return ShareLinkResponse(
        project_id=project_id,
        link_access=share_doc["link_access"],
        share_token=share_doc.get("share_token"),
        share_url=share_url,
        created_at=share_doc["created_at"],
        updated_at=share_doc["updated_at"],
    )

@router.get("/{project_id}/by-token", response_model=ProjectResponse)
async def get_project_by_share_token(
    project_id: str,
    token: str = Query(..., description="Share token"),
    user_id: Optional[str] = Depends(get_optional_user_email),
):
    """access a project using a share token"""
    projects_collection = get_projects_collection()
    project = await projects_collection.find_one({"_id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if user_id and project["owner_id"] == user_id:
        project["id"] = str(project["_id"])
        return ProjectResponse(**project)

    shares_collection = get_project_shares_collection()
    share_doc = await shares_collection.find_one({
        "project_id": project_id,
        "share_token": token
    })

    if not share_doc or share_doc["link_access"] == LinkAccessLevel.NONE:
        raise HTTPException(status_code=403, detail="Invalid or expired share token")

    project["id"] = str(project["_id"])
    return ProjectResponse(**project)
