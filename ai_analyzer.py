import os
import httpx
import json
from models import ScanRequest, Threat
from typing import List, Optional


class AIAnalyzer:
    GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

    @staticmethod
    async def analyze(req: ScanRequest, threats: List[Threat]) -> Optional[str]:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            return None

        # Build a concise summary for the model
        threat_summary = []
        for t in threats:
            if t.severity in ("critical", "high", "medium"):
                threat_summary.append(f"[{t.severity.upper()}] {t.title}: {t.description}")

        dom = req.domIndicators or {}
        context = {
            "url": req.url,
            "protocol": req.protocol,
            "is_login_page": dom.get("isLoginPage", False),
            "is_payment_page": dom.get("isPaymentPage", False),
            "script_count": len(req.scripts or []),
            "form_count": len(req.forms or []),
            "iframe_count": len(req.iframes or []),
            "external_domains": len(req.externalLinks or []),
            "detected_threats": threat_summary[:10],
        }

        prompt = f"""You are a cybersecurity expert analyzing a web page security scan result.

Page context:
{json.dumps(context, indent=2)}

Based on this scan data, provide a concise (2-3 sentences) security assessment:
1. Overall risk level and the most critical concern
2. What the user should or should not do on this page
3. One specific action to improve security

Be direct and actionable. Do not repeat the threat names verbatim — synthesize them into a coherent assessment."""

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    AIAnalyzer.GROQ_URL,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "llama-3.1-8b-instant",
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": 200,
                        "temperature": 0.3,
                    },
                )
                data = response.json()
                return data["choices"][0]["message"]["content"].strip()
        except Exception as e:
            return None
