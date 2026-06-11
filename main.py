from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Any
import logging
import os
from datetime import datetime

from analyzers.dom_analyzer import DOMAnalyzer
from analyzers.header_analyzer import HeaderAnalyzer
from analyzers.script_analyzer import ScriptAnalyzer
from analyzers.network_analyzer import NetworkAnalyzer
from analyzers.ai_analyzer import AIAnalyzer
from models import ScanRequest, HeaderRequest, ScanResult, Threat

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Antigravity API",
    description="AI-powered web threat detection engine",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Extension + dashboard
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Scan history stored in memory (use DB in production)
scan_history: list[dict] = []

@app.get("/")
def root():
    return {"status": "Antigravity online", "version": "2.0.0"}

@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

@app.post("/api/scan", response_model=ScanResult)
async def analyze_page(request: ScanRequest):
    """
    Main endpoint: receives page data from browser extension,
    runs all analyzers, returns threat report.
    """
    logger.info(f"Scanning: {request.url}")
    threats: list[Threat] = []

    try:
        # 1. DOM Analysis
        dom_threats = DOMAnalyzer.analyze(request)
        threats.extend(dom_threats)

        # 2. Script Analysis
        script_threats = ScriptAnalyzer.analyze(request)
        threats.extend(script_threats)

        # 3. Network/Request Analysis
        network_threats = NetworkAnalyzer.analyze(request)
        threats.extend(network_threats)

        # 4. AI Analysis (Groq) - only if API key available
        ai_summary = None
        if os.getenv("GROQ_API_KEY") and (threats or request.domIndicators):
            try:
                ai_summary = await AIAnalyzer.analyze(request, threats)
            except Exception as e:
                logger.warning(f"AI analysis failed: {e}")

        # Build result
        threat_count = len([t for t in threats if t.severity != "info"])
        risk_score = calculate_risk_score(threats)

        result = ScanResult(
            url=request.url,
            domain=request.domain,
            timestamp=request.timestamp or datetime.utcnow().isoformat(),
            threats=threats,
            threat_count=threat_count,
            risk_score=risk_score,
            risk_level=get_risk_level(risk_score),
            ai_summary=ai_summary,
            stats={
                "scripts_analyzed": len(request.scripts or []),
                "forms_analyzed": len(request.forms or []),
                "iframes_found": len(request.iframes or []),
                "external_links": len(request.externalLinks or []),
                "cookies": len(request.cookies or []),
            }
        )

        # Store in history
        scan_history.insert(0, result.model_dump())
        if len(scan_history) > 100:
            scan_history.pop()

        return result

    except Exception as e:
        logger.error(f"Scan failed for {request.url}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/headers")
async def analyze_headers(request: HeaderRequest):
    """Receives HTTP response headers from background script, analyzes them."""
    threats = HeaderAnalyzer.analyze(request)
    return {
        "url": request.url,
        "threats": [t.model_dump() for t in threats],
        "threat_count": len(threats),
    }


@app.get("/api/history")
def get_history(limit: int = 20):
    """Get recent scan history."""
    return {"scans": scan_history[:limit], "total": len(scan_history)}


@app.get("/api/history/{domain}")
def get_history_by_domain(domain: str):
    """Get scan history for a specific domain."""
    results = [s for s in scan_history if s.get("domain") == domain]
    return {"scans": results[:20], "domain": domain}


@app.get("/api/stats")
def get_stats():
    """Aggregate stats across all scans."""
    if not scan_history:
        return {"total_scans": 0, "total_threats": 0, "high_risk_sites": 0}

    total_threats = sum(s.get("threat_count", 0) for s in scan_history)
    high_risk = sum(1 for s in scan_history if s.get("risk_level") in ("high", "critical"))
    sev_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for scan in scan_history:
        for t in scan.get("threats", []):
            sev = t.get("severity", "low")
            sev_counts[sev] = sev_counts.get(sev, 0) + 1

    return {
        "total_scans": len(scan_history),
        "total_threats": total_threats,
        "high_risk_sites": high_risk,
        "severity_breakdown": sev_counts,
        "recent_domains": list({s["domain"] for s in scan_history[:10]}),
    }


def calculate_risk_score(threats: list[Threat]) -> int:
    score = 0
    weights = {"critical": 40, "high": 20, "medium": 8, "low": 2, "info": 0}
    for t in threats:
        score += weights.get(t.severity, 0)
    return min(score, 100)


def get_risk_level(score: int) -> str:
    if score >= 60: return "critical"
    if score >= 30: return "high"
    if score >= 10: return "medium"
    if score > 0:   return "low"
    return "safe"
