from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from core.config import get_settings
from api import threats, agents, chat
import asyncio
import random
import json
import os
from dotenv import load_dotenv

load_dotenv()

settings = get_settings()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API for ERA_CURITY - AI-powered cybersecurity defense platform"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(threats.router, prefix=f"{settings.API_V1_STR}/threats", tags=["threats"])
app.include_router(agents.router, prefix=f"{settings.API_V1_STR}/agents", tags=["agents"])
app.include_router(chat.router, prefix=f"{settings.API_V1_STR}/chat", tags=["chat"])

# Serve frontend static files
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    # If the file exists in the root of dist (e.g., vite.svg, favicon.ico), serve it
    file_path = os.path.join(frontend_dist, full_path)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    
    # Otherwise, return index.html for React Router
    index_path = os.path.join(frontend_dist, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Welcome to the ERA_CURITY API. Build the frontend to see the UI."}

# WebSocket for Live Monitoring Mock
@app.websocket("/ws/live-monitoring")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Generate mock agentic behavior logs
            events = [
                "Agentic network scan initiated from 192.168.1.55",
                "Anomaly: High-entropy payload detected in /api/v1/login",
                "TriageBot Alpha inspecting suspicious outbound traffic",
                "Containment Unit 7 blocking IP 103.45.22.1",
                "Sherlock-X querying Groq for log analysis..."
            ]
            
            data = {
                "type": "log_event",
                "message": random.choice(events),
                "severity": random.choice(["info", "warning", "critical"])
            }
            
            await websocket.send_text(json.dumps(data))
            await asyncio.sleep(random.uniform(1.0, 3.5))
    except WebSocketDisconnect:
        print("Client disconnected from live monitoring")
