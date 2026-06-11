from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from services.ai import chat_with_groq

router = APIRouter()

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]

@router.post("/")
async def chat_endpoint(request: ChatRequest):
    if not request.messages:
        raise HTTPException(status_code=400, detail="Messages required")
    
    # Ensure system prompt is set for security context
    system_message = {"role": "system", "content": "You are a senior cybersecurity analyst assisting a user. Keep responses professional and focused on security."}
    
    # Convert Pydantic models to dicts
    msgs = [system_message] + [{"role": m.role, "content": m.content} for m in request.messages]
    
    response = await chat_with_groq(msgs)
    return {"reply": response}
