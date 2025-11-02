import logging
from uuid import uuid4
import asyncio
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.squander_client import SquanderClient
from app.services.websocket_manager import manager

logger = logging.getLogger(__name__)
router = APIRouter()

class PartitionRequest(BaseModel):
    numQubits: int
    placedGates: list
    measurements: list
    options: Optional[dict] = None
    strategy: Optional[str] = "kahn"  # kahn, ilp, tdag, etc.

active_jobs = {}

@router.post("/{circuit_id}/partition")
async def partition_circuit(circuit_id: str, request: PartitionRequest):
    if request.numQubits <= 0 or not request.placedGates:
        raise HTTPException(status_code=400, detail="Invalid circuit data")
    
    job_id = str(uuid4())
    active_jobs[job_id] = {"circuit_id": circuit_id, "status": "queued"}
    
    asyncio.create_task(
        run_partition_job(
            job_id=job_id,
            circuit_id=circuit_id,
            num_qubits=request.numQubits,
            placed_gates=request.placedGates,
            measurements=request.measurements,
            options=request.options,
            strategy=request.strategy or "kahn",
        )
    )

    return {"jobId": job_id, "status": "queued"}

@router.get("/{circuit_id}/jobs")
async def list_partition_jobs(circuit_id: str):
    jobs = {jid: info for jid, info in active_jobs.items() if info["circuit_id"] == circuit_id}
    return {"jobs": jobs}


@router.get("/{circuit_id}/jobs/{job_id}")
async def get_partition_job(circuit_id: str, job_id: str):
    job = active_jobs.get(job_id)
    if not job or job["circuit_id"] != circuit_id:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"jobId": job_id, **job}

async def run_partition_job(
    job_id: str,
    circuit_id: str,
    num_qubits: int,
    placed_gates: list,
    measurements: list,
    options: dict,
    strategy: str = "kahn",
) -> None:
    client = SquanderClient()
    room = f"partition-{job_id}"
    
    logger.info(f"[run_partition_job] Starting job {job_id} in room {room}")
    
    max_wait = 10
    wait_interval = 0.1
    elapsed = 0
    while elapsed < max_wait:
        room_members = manager.get_room_connections(room)
        if room_members:
            logger.info(f"[run_partition_job] Room {room} has members: {room_members}")
            break
        await asyncio.sleep(wait_interval)
        elapsed += wait_interval
    else:
        logger.warning(f"[run_partition_job] Timeout waiting for client to join room {room}")
    
    try:
        logger.info(f"[run_partition_job] Broadcasting connecting phase for job {job_id}")
        await manager.broadcast_to_room(room, {
            "type": "phase",
            "phase": "connecting",
            "message": "Connecting to SQUANDER...",
            "jobId": job_id,
            "circuitId": circuit_id
        })
        
        logger.info(f"[run_partition_job] Connecting SSH client for job {job_id}")
        await client.connect()
        logger.info(f"[run_partition_job] SSH connected for job {job_id}")
        
        await manager.broadcast_to_room(room, {
            "type": "phase",
            "phase": "connected",
            "message": "Connected to SQUANDER",
            "jobId": job_id,
            "circuitId": circuit_id
        })
        
        logger.info(f"[run_partition_job] Starting partition for job {job_id}")
        async for update in client.run_partition(
            job_id=job_id,
            num_qubits=num_qubits,
            placed_gates=placed_gates,
            measurements=measurements,
            options=options or {},
            strategy=strategy,
        ):
            await manager.broadcast_to_room(room, {**update, "jobId": job_id, "circuitId": circuit_id})
    except Exception as e:
        logger.error(f"[run_partition_job] Job {job_id} error: {str(e)}", exc_info=True)
        await manager.broadcast_to_room(room, {
            "type": "error",
            "circuitId": circuit_id,
            "jobId": job_id,
            "message": str(e)
        })
    finally:
        await client.disconnect()
        if job_id in active_jobs:
            del active_jobs[job_id]