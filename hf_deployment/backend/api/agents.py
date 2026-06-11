from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter()

class AgentStatus(BaseModel):
    id: str
    name: str
    role: str
    status: str
    current_task: str

@router.get("/active", response_model=List[AgentStatus])
async def get_active_agents():
    # Mock data for active defensive agents
    return [
        {
            "id": "AGT-TR-01",
            "name": "TriageBot Alpha",
            "role": "Triage",
            "status": "Active",
            "current_task": "Scanning incoming API requests for anomalies"
        },
        {
            "id": "AGT-IV-02",
            "name": "Sherlock-X",
            "role": "Investigation",
            "status": "Idle",
            "current_task": "Awaiting assignment"
        },
        {
            "id": "AGT-CT-03",
            "name": "Containment Unit 7",
            "role": "Containment",
            "status": "Active",
            "current_task": "Isolating compromised container instances"
        }
    ]
