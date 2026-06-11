import os
from groq import Groq
from core.config import get_settings
from pydantic import BaseModel
from typing import List, Optional
import requests
from urllib.parse import urlparse

settings = get_settings()

class AIResponse(BaseModel):
    response: str
    model: str
    latency_ms: Optional[float] = None

def get_groq_client():
    if not settings.GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is not set")
    return Groq(api_key=settings.GROQ_API_KEY)

async def analyze_threat_with_groq(log_data: str) -> AIResponse:
    try:
        client = get_groq_client()
        prompt = f"""
        You are an expert cybersecurity threat analyzer. Analyze the following log/text for anomalies, prompt injections, or malicious behavior.
        Provide a concise summary and a severity level (LOW, MEDIUM, HIGH, CRITICAL).
        
        Log Data:
        {log_data}
        """
        
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You are a cybersecurity AI."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=1024,
        )
        
        return AIResponse(
            response=completion.choices[0].message.content,
            model="llama-3.1-8b-instant"
        )
    except Exception as e:
        return AIResponse(response=f"Error analyzing with Groq: {str(e)}", model="error")

async def chat_with_groq(messages: List[dict]) -> str:
    try:
        client = get_groq_client()
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            temperature=0.7,
            max_tokens=1024,
        )
        return completion.choices[0].message.content
    except Exception as e:
        return f"Error connecting to Groq: {str(e)}"

async def analyze_url_with_groq(url: str) -> AIResponse:
    try:
        # Validate URL
        parsed = urlparse(url)
        if not parsed.scheme:
            url = "https://" + url
            
        # Fetch website content and headers
        resp = requests.get(url, timeout=10)
        headers_str = "\\n".join([f"{k}: {v}" for k, v in resp.headers.items()])
        # Take first 5000 chars of HTML to avoid token limits
        html_snippet = resp.text[:5000] 
        
        client = get_groq_client()
        prompt = f"""
        You are an expert automated penetration tester. Perform a passive security analysis on the following website.
        
        Target URL: {url}
        Status Code: {resp.status_code}
        
        HTTP Headers:
        {headers_str}
        
        HTML Snippet (first 5000 chars):
        {html_snippet}
        
        You MUST output your analysis in valid JSON format with the following exact keys:
        - "risk_score": An integer from 0 to 100 (where 100 is highly secure, and 0 is extremely critical/vulnerable).
        - "risk_level": One of ["LOW", "MEDIUM", "HIGH", "CRITICAL"].
        - "summary": A concise, jargon-free summary of the website's security posture.
        - "missing_headers": A list of strings, naming the important security headers that are missing.
        - "vulnerabilities": A list of strings, identifying any potential vulnerabilities or exposed info.
        
        Output only the JSON object.
        """
        
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You are a cybersecurity AI. Provide actionable insights. Output strictly valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=1024,
            response_format={"type": "json_object"}
        )
        
        return AIResponse(
            response=completion.choices[0].message.content,
            model="llama-3.1-8b-instant"
        )
    except Exception as e:
        return AIResponse(response=f"Error analyzing URL: {str(e)}", model="error")
