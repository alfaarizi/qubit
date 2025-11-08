"""projects api endpoints"""
from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from bson import ObjectId
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from app.models import Project, User, SimulationResults
from app.db import get_database
from app.api.dependencies import get_current_user

router = APIRouter()

@router.get("", response_model=List[ProjectResponse])
async def list_projects(current_user: User = Depends(get_current_user)):
    """get all projects for current user"""
    db = get_database()
    projects_data = db.projects.find({"user_id": current_user.email})
    projects = []
    for data in projects_data:
        project = Project.from_dict(data)
        projects.append(ProjectResponse(
            id=str(project.id),
            name=project.name,
            description=project.description,
            circuits=[c.model_dump() for c in project.circuits],
            activeCircuitId=project.active_circuit_id,
            createdAt=int(project.created_at.timestamp() * 1000),
            updatedAt=int(project.updated_at.timestamp() * 1000),
        ))
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
    )
    result = db.projects.insert_one(project.to_dict())
    project.id = str(result.inserted_id)
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        circuits=[c.model_dump() for c in project.circuits],
        activeCircuitId=project.active_circuit_id,
        createdAt=int(project.created_at.timestamp() * 1000),
        updatedAt=int(project.updated_at.timestamp() * 1000),
    )

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, current_user: User = Depends(get_current_user)):
    """get project by id"""
    db = get_database()
    try:
        project_data = db.projects.find_one({"_id": ObjectId(project_id), "user_id": current_user.email})
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="project not found")
    if not project_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="project not found")
    project = Project.from_dict(project_data)
    return ProjectResponse(
        id=str(project.id),
        name=project.name,
        description=project.description,
        circuits=[c.model_dump() for c in project.circuits],
        activeCircuitId=project.active_circuit_id,
        createdAt=int(project.created_at.timestamp() * 1000),
        updatedAt=int(project.updated_at.timestamp() * 1000),
    )

@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, project_update: ProjectUpdate, current_user: User = Depends(get_current_user)):
    """update project"""
    db = get_database()
    try:
        project_data = db.projects.find_one({"_id": ObjectId(project_id), "user_id": current_user.email})
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="project not found")
    if not project_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="project not found")
    from datetime import datetime, timezone
    update_data = project_update.model_dump(exclude_unset=True, by_alias=False)
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc)
        db.projects.update_one({"_id": ObjectId(project_id)}, {"$set": update_data})
    updated_data = db.projects.find_one({"_id": ObjectId(project_id)})
    project = Project.from_dict(updated_data)
    return ProjectResponse(
        id=str(project.id),
        name=project.name,
        description=project.description,
        circuits=[c.model_dump() for c in project.circuits],
        activeCircuitId=project.active_circuit_id,
        createdAt=int(project.created_at.timestamp() * 1000),
        updatedAt=int(project.updated_at.timestamp() * 1000),
    )

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
        project_data = db.projects.find_one({"_id": ObjectId(project_id), "user_id": current_user.email})
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
    )
    result = db.projects.insert_one(new_project.to_dict())
    new_project.id = str(result.inserted_id)
    return ProjectResponse(
        id=new_project.id,
        name=new_project.name,
        description=new_project.description,
        circuits=[c.model_dump() for c in new_project.circuits],
        activeCircuitId=new_project.active_circuit_id,
        createdAt=int(new_project.created_at.timestamp() * 1000),
        updatedAt=int(new_project.updated_at.timestamp() * 1000),
    )

@router.put("/{project_id}/circuits/{circuit_id}/results", response_model=ProjectResponse)
async def update_circuit_results(project_id: str, circuit_id: str, results: SimulationResults, current_user: User = Depends(get_current_user)):
    """update simulation results for a specific circuit"""
    db = get_database()
    try:
        project_data = db.projects.find_one({"_id": ObjectId(project_id), "user_id": current_user.email})
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="project not found")
    if not project_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="project not found")
    from datetime import datetime, timezone
    result_dict = results.model_dump()
    result_dict["timestamp"] = int(datetime.now(timezone.utc).timestamp() * 1000)
    db.projects.update_one(
        {"_id": ObjectId(project_id), "circuits.id": circuit_id},
        {"$set": {"circuits.$.results": result_dict, "updated_at": datetime.now(timezone.utc)}}
    )
    updated_data = db.projects.find_one({"_id": ObjectId(project_id)})
    project = Project.from_dict(updated_data)
    return ProjectResponse(
        id=str(project.id),
        name=project.name,
        description=project.description,
        circuits=[c.model_dump() for c in project.circuits],
        activeCircuitId=project.active_circuit_id,
        createdAt=int(project.created_at.timestamp() * 1000),
        updatedAt=int(project.updated_at.timestamp() * 1000),
    )
