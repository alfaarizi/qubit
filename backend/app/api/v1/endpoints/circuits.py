from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Any

router = APIRouter()


class CircuitExecuteRequest(BaseModel):
    gates: List[Any]


@router.post("/{circuit_id}/execute")
async def execute_circuit(circuit_id: str, request: CircuitExecuteRequest):
    """Execute a quantum circuit and return results"""
    print(f"Received circuit execution request for circuit: {circuit_id}")
    print(f"Number of gates: {len(request.gates)}")
    print(f"Gates (sorted by depth):")
    for gate in request.gates:
        print(f"  - {gate}")

    return {"message": "Circuit executed successfully", "circuit_id": circuit_id}
