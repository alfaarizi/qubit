from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Any
import asyncio

from app.services.websocket_manager import manager

router = APIRouter()


class CircuitExecuteRequest(BaseModel):
    gates: List[Any]


@router.post("/{circuit_id}/execute")
async def execute_circuit(circuit_id: str, request: CircuitExecuteRequest):
    """Execute a quantum circuit and return results"""
    print(f"Received circuit execution request for circuit: {circuit_id}")
    print(f"Number of gates: {len(request.gates)}")

    # Simulate 10 seconds of execution with progress updates
    total_steps = 10
    for step in range(total_steps + 1):
        progress = (step / total_steps) * 100

        # Send progress update via WebSocket to the circuit room
        await manager.broadcast_to_room(
            f"circuit-{circuit_id}",
            {
                "type": "circuit_execution_progress",
                "circuit_id": circuit_id,
                "progress": progress,
                "step": step,
                "total_steps": total_steps
            }
        )

        # Wait 1 second between updates (except after the last one)
        if step < total_steps:
            await asyncio.sleep(1)

    # Send completion message with the gates data
    await manager.broadcast_to_room(
        f"circuit-{circuit_id}",
        {
            "type": "circuit_execution_complete",
            "circuit_id": circuit_id,
            "result": {
                "gates": request.gates,
                "num_gates": len(request.gates),
                "execution_time": 10.0
            }
        }
    )

    return {
        "message": "Circuit executed successfully",
        "circuit_id": circuit_id,
        "gates": request.gates
    }
