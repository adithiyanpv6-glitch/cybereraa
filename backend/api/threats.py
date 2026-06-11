from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, HttpUrl
from services.ai import analyze_threat_with_groq, analyze_url_with_groq, AIResponse
from typing import List
import random
import asyncio

router = APIRouter()

class ThreatAnalysisRequest(BaseModel):
    log_data: str

class Incident(BaseModel):
    id: str
    severity: str
    description: str
    timestamp: str
    status: str

@router.post("/analyze", response_model=AIResponse)
async def analyze_threat(request: ThreatAnalysisRequest):
    if not request.log_data:
        raise HTTPException(status_code=400, detail="Log data is required")
    
    response = await analyze_threat_with_groq(request.log_data)
    return response

class UrlAnalysisRequest(BaseModel):
    url: str

@router.post("/analyze-url", response_model=AIResponse)
async def analyze_url(request: UrlAnalysisRequest):
    if not request.url:
        raise HTTPException(status_code=400, detail="URL is required")
    
    response = await analyze_url_with_groq(request.url)
    return response

@router.get("/recent", response_model=List[Incident])
async def get_recent_threats():
    # Mock data for dashboard
    return [
        {
            "id": "INC-001",
            "severity": "CRITICAL",
            "description": "Agentic lateral movement detected in subnet A",
            "timestamp": "2026-06-11T10:00:00Z",
            "status": "Investigating"
        },
        {
            "id": "INC-002",
            "severity": "HIGH",
            "description": "Unusual LLM prompt injection pattern via API",
            "timestamp": "2026-06-11T09:45:00Z",
            "status": "Contained"
        },
        {
            "id": "INC-003",
            "severity": "MEDIUM",
            "description": "Multiple failed SSH attempts using known botnet signatures",
            "timestamp": "2026-06-11T09:30:00Z",
            "status": "Resolved"
        }
    ]
