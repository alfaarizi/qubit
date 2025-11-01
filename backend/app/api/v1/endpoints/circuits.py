from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import List, Any
import asyncio

from app.services.websocket_manager import manager

router = APIRouter()


class CircuitExecuteRequest(BaseModel):
    gates: List[Any]


@router.post("/{circuit_id}/execute")
async def execute_circuit(circuit_id: str, request: CircuitExecuteRequest, req: Request):
    """Execute a quantum circuit and return results"""
    print(f"Received circuit execution request for circuit: {circuit_id}")
    print(f"Number of gates: {len(request.gates)}")

    try:
        # Step 1: Acknowledge receipt (5%)
        if await req.is_disconnected():
            print(f"Client disconnected during execution of circuit: {circuit_id}")
            return {"message": "Execution aborted", "circuit_id": circuit_id}

        await manager.broadcast_to_room(
            f"circuit-{circuit_id}",
            {
                "type": "circuit_execution_status",
                "circuit_id": circuit_id,
                "status": "Circuit received by backend",
                "progress": 5
            }
        )
        await asyncio.sleep(0.5)

        # Step 2: Start partitioning (10%)
        if await req.is_disconnected():
            print(f"Client disconnected during execution of circuit: {circuit_id}")
            return {"message": "Execution aborted", "circuit_id": circuit_id}

        await manager.broadcast_to_room(
            f"circuit-{circuit_id}",
            {
                "type": "circuit_execution_status",
                "circuit_id": circuit_id,
                "status": "Partitioning circuit topology...",
                "progress": 10
            }
        )

        # Simulate partitioning process (10% -> 60%)
        num_gates = len(request.gates)
        partition_steps = 5
        for i in range(partition_steps):
            if await req.is_disconnected():
                print(f"Client disconnected during partitioning of circuit: {circuit_id}")
                return {"message": "Execution aborted", "circuit_id": circuit_id}

            await asyncio.sleep(0.8)
            progress = 10 + ((i + 1) / partition_steps) * 50
            await manager.broadcast_to_room(
                f"circuit-{circuit_id}",
                {
                    "type": "circuit_execution_progress",
                    "circuit_id": circuit_id,
                    "progress": progress
                }
            )

        # Step 3: Partitioning complete (60%)
        if await req.is_disconnected():
            print(f"Client disconnected during execution of circuit: {circuit_id}")
            return {"message": "Execution aborted", "circuit_id": circuit_id}

        await manager.broadcast_to_room(
            f"circuit-{circuit_id}",
            {
                "type": "circuit_execution_status",
                "circuit_id": circuit_id,
                "status": "Circuit partitioned successfully",
                "progress": 60
            }
        )
        await asyncio.sleep(0.5)

        # Step 4: Executing on quantum hardware (60% -> 95%)
        if await req.is_disconnected():
            print(f"Client disconnected during execution of circuit: {circuit_id}")
            return {"message": "Execution aborted", "circuit_id": circuit_id}

        await manager.broadcast_to_room(
            f"circuit-{circuit_id}",
            {
                "type": "circuit_execution_status",
                "circuit_id": circuit_id,
                "status": "Executing on quantum hardware...",
                "progress": 65
            }
        )

        execution_steps = 3
        for i in range(execution_steps):
            if await req.is_disconnected():
                print(f"Client disconnected during quantum execution of circuit: {circuit_id}")
                return {"message": "Execution aborted", "circuit_id": circuit_id}

            await asyncio.sleep(1)
            progress = 65 + ((i + 1) / execution_steps) * 30
            await manager.broadcast_to_room(
                f"circuit-{circuit_id}",
                {
                    "type": "circuit_execution_progress",
                    "circuit_id": circuit_id,
                    "progress": progress
                }
            )

        # Step 5: Processing results (95%)
        if await req.is_disconnected():
            print(f"Client disconnected during result processing of circuit: {circuit_id}")
            return {"message": "Execution aborted", "circuit_id": circuit_id}

        await manager.broadcast_to_room(
            f"circuit-{circuit_id}",
            {
                "type": "circuit_execution_status",
                "circuit_id": circuit_id,
                "status": "Processing measurement results...",
                "progress": 95
            }
        )
        await asyncio.sleep(0.5)

        # Step 6: Complete (100%)
        await manager.broadcast_to_room(
            f"circuit-{circuit_id}",
            {
                "type": "circuit_execution_complete",
                "circuit_id": circuit_id,
                "progress": 100,
                "result": {
                    "gates": request.gates,
                    "num_gates": num_gates,
                    "execution_time": 6.0
                }
            }
        )

        return {
            "message": "Circuit executed successfully",
            "circuit_id": circuit_id,
            "gates": request.gates
        }

    except asyncio.CancelledError:
        print(f"Circuit execution cancelled for circuit: {circuit_id}")
        # broadcast abort message via WebSocket
        await manager.broadcast_to_room(
            f"circuit-{circuit_id}",
            {
                "type": "circuit_execution_aborted",
                "circuit_id": circuit_id,
            }
        )
        return {"message": "Execution aborted", "circuit_id": circuit_id}