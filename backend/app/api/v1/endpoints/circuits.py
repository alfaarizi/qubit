import logging
from uuid import uuid4
import asyncio
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.services.squander_client import SquanderClient
from app.services.websocket_manager import manager
from app.api.dependencies import get_current_user
from app.models import User

logger = logging.getLogger(__name__)
router = APIRouter()

class PartitionRequest(BaseModel):
    num_qubits: int
    placed_gates: list
    measurements: list
    options: Optional[dict] = None
    strategy: Optional[str] = "kahn"
    session_id: Optional[str] = None
    circuit_name: Optional[str] = None

class ImportQasmRequest(BaseModel):
    qasm_code: str
    session_id: Optional[str] = None
    options: Optional[dict] = None

active_jobs = {}

def verify_job_ownership(job_id: str, user_id: str) -> bool:
    """verify user owns the job"""
    job = active_jobs.get(job_id)
    return job is not None and job.get("user_id") == user_id

@router.post("/{circuit_id}/partition")
async def partition_circuit(
    circuit_id: str,
    request: PartitionRequest,
    current_user: User = Depends(get_current_user)
):
    if request.num_qubits <= 0 or not request.placed_gates:
        raise HTTPException(status_code=400, detail="Invalid circuit data")
    job_id = str(uuid4())
    active_jobs[job_id] = {
        "circuit_id": circuit_id,
        "status": "queued",
        "user_id": str(current_user._id),
        "job_type": "partition",
        "task": None
    }
    logger.info(f"[partition_circuit] Received partition request for circuit {circuit_id} with job ID {job_id}")
    task = asyncio.create_task(run_partition(
        job_id=job_id,
        circuit_id=circuit_id,
        num_qubits=request.num_qubits,
        placed_gates=request.placed_gates,
        measurements=request.measurements,
        options=request.options,
        strategy=request.strategy or "kahn",
        session_id=request.session_id,
        circuit_name=request.circuit_name,
    ))
    active_jobs[job_id]["task"] = task
    return {"job_id": job_id, "status": "queued"}

@router.get("/{circuit_id}/jobs")
async def list_jobs(
    circuit_id: str,
    current_user: User = Depends(get_current_user)
):
    jobs = {
        jid: info for jid, info in active_jobs.items()
        if info["circuit_id"] == circuit_id and info.get("user_id") == str(current_user._id)
    }
    return {"jobs": jobs}

@router.get("/{circuit_id}/jobs/{job_id}")
async def get_job(
    circuit_id: str,
    job_id: str,
    current_user: User = Depends(get_current_user)
):
    job = active_jobs.get(job_id)
    if not job or job["circuit_id"] != circuit_id:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.get("user_id") != str(current_user._id):
        raise HTTPException(status_code=403, detail="Not authorized to access this job")
    return {"job_id": job_id, **job}

@router.post("/{circuit_id}/jobs/{job_id}/cancel")
async def cancel_job(
    circuit_id: str,
    job_id: str,
    current_user: User = Depends(get_current_user)
):
    job = active_jobs.get(job_id)
    if not job or job["circuit_id"] != circuit_id:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.get("user_id") != str(current_user._id):
        raise HTTPException(status_code=403, detail="Not authorized to cancel this job")

    task = job.get("task")
    if task and not task.done():
        task.cancel()
        logger.info(f"[cancel_job] Cancelled job {job_id} for circuit {circuit_id}")
        # broadcast cancellation to websocket room
        job_type = job.get("job_type")
        room = f"{job_type}-{job_id}"
        await manager.broadcast_to_room(room, {
            "type": "cancelled",
            "job_id": job_id,
            "circuit_id": circuit_id,
            "message": "Job cancelled by user"
        })

    # clean up the job
    if job_id in active_jobs:
        del active_jobs[job_id]

    return {"job_id": job_id, "status": "cancelled"}

@router.post("/{circuit_id}/import-qasm")
async def import_qasm(
    circuit_id: str,
    request: ImportQasmRequest,
    current_user: User = Depends(get_current_user)
):
    job_id = str(uuid4())
    active_jobs[job_id] = {
        "circuit_id": circuit_id,
        "status": "processing",
        "user_id": str(current_user._id),
        "job_type": "import",
        "task": None
    }
    room = f"import-{job_id}"
    logger.info(f"[import_qasm] Received QASM import request for circuit {circuit_id} in room {room}")
    task = asyncio.create_task(run_import_qasm(
        job_id=job_id,
        circuit_id=circuit_id,
        qasm_code=request.qasm_code,
        session_id=request.session_id,
        options=request.options,
    ))
    active_jobs[job_id]["task"] = task
    return {"job_id": job_id, "status": "processing"}

async def _wait_for_room_connection(room: str, check_interval: float = 0.1) -> None:
    """Wait until at least one connection joins the room"""
    while not manager.get_room_connections(room):
        await asyncio.sleep(check_interval)

async def run_import_qasm(
    job_id: str,
    circuit_id: str,
    qasm_code: str,
    session_id: Optional[str] = None,
    options: Optional[dict] = None,
) -> None:
    room = f"import-{job_id}"
    client = None
    try:
        logger.info(f"[run_import_qasm] Starting import {job_id} in room {room}")
        try:
            await asyncio.wait_for(
                _wait_for_room_connection(room),
                timeout=10.0
            )
        except asyncio.TimeoutError:
            logger.warning(f"[run_import_qasm] Timeout waiting for client to join room {room}")
        client = await SquanderClient.create(session_id=session_id)
        # debug: broadcast client mode
        await manager.broadcast_to_room(room, {
            "type": "debug",
            "message": f"DEBUG: use_local={client.use_local}, session_id={session_id}",
            "job_id": job_id,
            "circuit_id": circuit_id
        })
        # broadcast connecting/connected phase only for remote execution
        if not client.use_local:
            await manager.broadcast_to_room(room, {
                "type": "phase",
                "phase": "connecting",
                "message": "Connecting to SQUANDER...",
                "progress": 0,
                "job_id": job_id,
                "circuit_id": circuit_id
            })
            # connect if not using pooled connection
            if not session_id:
                logger.info(f"[run_import_qasm] Connecting SSH client for import {job_id}")
                await client.connect()
            await manager.broadcast_to_room(room, {
                "type": "phase",
                "phase": "connected",
                "message": "Connected to SQUANDER",
                "progress": 1,
                "job_id": job_id,
                "circuit_id": circuit_id
            })
        # Run import and stream updates
        logger.info(f"[run_import_qasm] Starting QASM import for {job_id}")
        async for update in client.import_qasm(qasm_code, options or {}):
            await manager.broadcast_to_room(room, {
                **update,
                "job_id": job_id,
                "circuit_id": circuit_id
            })
            if update.get("type") == "complete":
                logger.info(f"[run_import_qasm] Import {job_id} completed successfully")
            elif update.get("type") == "error":
                logger.error(f"[run_import_qasm] Import {job_id} failed: {update.get('message')}")
    except Exception as e:
        logger.error(f"[run_import_qasm] Import {job_id} error: {str(e)}", exc_info=True)
        await manager.broadcast_to_room(room, {
            "type": "error",
            "circuit_id": circuit_id,
            "job_id": job_id,
            "message": str(e)
        })
    finally:
        # Clean up non-pooled connections
        if client and not session_id:
            try:
                await client.disconnect()
            except Exception as e:
                logger.warning(f"[run_import_qasm] Error disconnecting: {e}")

async def run_partition(
    job_id: str,
    circuit_id: str,
    num_qubits: int,
    placed_gates: list,
    measurements: list,
    options: dict,
    strategy: str = "kahn",
    session_id: Optional[str] = None,
    circuit_name: Optional[str] = None,
) -> None:
    room = f"partition-{job_id}"
    client = None
    try:
        logger.info(f"[run_partition] Starting job {job_id} in room {room}")
        try:
            await asyncio.wait_for(
                _wait_for_room_connection(room),
                timeout=10.0
            )
        except asyncio.TimeoutError:
            logger.warning(f"[run_import_qasm] Timeout waiting for client to join room {room}")
        logger.info(f"[run_partition] Got room connection for job {job_id}")
        client = await SquanderClient.create(session_id=session_id)
        logger.info(f"[run_partition] Got client for job {job_id} (local={client.use_local})")
        # debug: broadcast client mode
        await manager.broadcast_to_room(room, {
            "type": "debug",
            "message": f"DEBUG: use_local={client.use_local}, session_id={session_id}",
            "job_id": job_id,
            "circuit_id": circuit_id
        })
        # broadcast connecting/connected phase only for remote execution
        if not client.use_local:
            logger.info(f"[run_partition] Broadcasting connecting phase for job {job_id}")
            await manager.broadcast_to_room(room, {
                "type": "phase",
                "phase": "connecting",
                "message": "Connecting to SQUANDER...",
                "progress": 0,
                "job_id": job_id,
                "circuit_id": circuit_id
            })
            if not session_id:
                logger.info(f"[run_partition] Connecting SSH client for job {job_id}")
                await client.connect()
            await manager.broadcast_to_room(room, {
                "type": "phase",
                "phase": "connected",
                "message": "Connected to SQUANDER",
                "progress": 1,
                "job_id": job_id,
                "circuit_id": circuit_id
            })
        # Run partition and stream updates
        logger.info(f"[run_partition] Starting partition for job {job_id}")
        async for update in client.run_partition(
            job_id=job_id,
            num_qubits=num_qubits,
            placed_gates=placed_gates,
            measurements=measurements,
            options=options or {},
            strategy=strategy,
            circuit_name=circuit_name,
        ):
            await manager.broadcast_to_room(room, {
                **update,
                "job_id": job_id,
                "circuit_id": circuit_id
            })
    except Exception as e:
        logger.error(f"[run_partition] Job {job_id} error: {str(e)}", exc_info=True)
        await manager.broadcast_to_room(room, {
            "type": "error",
            "circuit_id": circuit_id,
            "job_id": job_id,
            "message": str(e)
        })
    finally:
        if client and not session_id:
            try:
                await client.disconnect()
            except Exception as e:
                logger.warning(f"[run_partition] Error disconnecting: {e}")
        if job_id in active_jobs:
            del active_jobs[job_id]