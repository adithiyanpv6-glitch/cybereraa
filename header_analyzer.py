from models import HeaderRequest, Threat
from typing import List
import uuid
import re

def threat(category, title, desc, severity, evidence=None, recommendation=None) -> Threat:
    return Threat(
        id=str(uuid.uuid4())[:8],
        category=category,
        title=title,
        description=desc,
        severity=severity,
        evidence=evidence,
        recommendation=recommendation,
    )

class HeaderAnalyzer:
    @staticmethod
    def analyze(req: HeaderRequest) -> List[Threat]:
        threats = []
        h = req.headers or {}

        # --- MISSING SECURITY HEADERS ---

        if not h.get("content-security-policy"):
            threats.append(threat(
                "HTTP Headers",
                "Missing Content-Security-Policy",
                "No CSP header. Without CSP, XSS attacks can load arbitrary scripts from any domain.",
                "medium",
                recommendation="Implement a strict CSP: default-src 'self'; script-src 'self'; object-src 'none'"
            ))

        if not h.get("x-frame-options") and not _csp_has_frame_ancestors(h.get("content-security-policy", "")):
            threats.append(threat(
                "HTTP Headers",
                "Missing X-Frame-Options",
                "Page can be embedded in iframes by any site. Enables clickjacking attacks.",
                "medium",
                recommendation="Add: X-Frame-Options: DENY or SAMEORIGIN"
            ))

        if not h.get("x-content-type-options"):
            threats.append(threat(
                "HTTP Headers",
                "Missing X-Content-Type-Options",
                "Browser may interpret responses with incorrect MIME types, enabling content sniffing attacks.",
                "low",
                recommendation="Add: X-Content-Type-Options: nosniff"
            ))

        if not h.get("strict-transport-security"):
            threats.append(threat(
                "HTTP Headers",
                "Missing HSTS Header",
                "No HTTP Strict Transport Security. Browser may be downgraded to HTTP connection.",
                "medium",
                recommendation="Add: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload"
            ))

        if not h.get("referrer-policy"):
            threats.append(threat(
                "HTTP Headers",
                "Missing Referrer-Policy",
                "Browser sends full URL in Referer header by default, potentially leaking sensitive URL parameters.",
                "low",
                recommendation="Add: Referrer-Policy: strict-origin-when-cross-origin"
            ))

        # --- DANGEROUS HEADER VALUES ---

        # CORS wildcard
        acao = h.get("access-control-allow-origin", "")
        if acao == "*":
            threats.append(threat(
                "HTTP Headers",
                "CORS Wildcard (Access-Control-Allow-Origin: *)",
                "Any website can make cross-origin requests and read responses from this server.",
                "medium",
                evidence="Access-Control-Allow-Origin: *",
                recommendation="Restrict CORS to specific trusted origins."
            ))

        # Server version disclosure
        server = h.get("server", "")
        if server and any(c.isdigit() for c in server):
            threats.append(threat(
                "Information Disclosure",
                "Server Version Disclosure",
                f"Server header reveals software version, making it easier for attackers to find known CVEs.",
                "low",
                evidence=f"Server: {server}",
                recommendation="Configure server to hide version: e.g. ServerTokens Prod (Apache), server_tokens off (Nginx)"
            ))

        powered_by = h.get("x-powered-by", "")
        if powered_by:
            threats.append(threat(
                "Information Disclosure",
                "Technology Stack Disclosure",
                "X-Powered-By reveals the backend technology, aiding attacker reconnaissance.",
                "low",
                evidence=f"X-Powered-By: {powered_by}",
                recommendation="Remove X-Powered-By header from server config."
            ))

        # Weak HSTS
        hsts = h.get("strict-transport-security", "")
        if hsts:
            max_age_match = re.search(r"max-age=(\d+)", hsts)
            if max_age_match:
                max_age = int(max_age_match.group(1))
                if max_age < 15552000:  # < 180 days
                    threats.append(threat(
                        "HTTP Headers",
                        "HSTS max-age Too Short",
                        f"HSTS max-age of {max_age} seconds ({max_age//86400} days) is too short. Recommended: 1 year+.",
                        "low",
                        evidence=f"Strict-Transport-Security: {hsts}",
                        recommendation="Set max-age to at least 31536000 (1 year)."
                    ))

        # Weak CSP
        csp = h.get("content-security-policy", "")
        if csp:
            if "'unsafe-eval'" in csp:
                threats.append(threat(
                    "HTTP Headers",
                    "CSP Allows unsafe-eval",
                    "Content Security Policy permits eval() and similar functions, partially defeating XSS protection.",
                    "medium",
                    evidence=f"CSP: ...{_truncate_directive(csp, 'unsafe-eval')}...",
                    recommendation="Remove 'unsafe-eval' from CSP unless absolutely necessary."
                ))
            if "'unsafe-inline'" in csp:
                threats.append(threat(
                    "HTTP Headers",
                    "CSP Allows unsafe-inline",
                    "CSP permits inline scripts/styles, which is the main attack vector for XSS.",
                    "medium",
                    evidence=f"CSP: ...{_truncate_directive(csp, 'unsafe-inline')}...",
                    recommendation="Replace 'unsafe-inline' with nonces or hashes."
                ))

        # Cookies
        cookies_header = h.get("set-cookie", "")
        if cookies_header:
            if "httponly" not in cookies_header.lower():
                threats.append(threat(
                    "Cookie Security",
                    "Cookie Missing HttpOnly Flag",
                    "Cookies without HttpOnly are accessible to JavaScript. XSS can steal session tokens.",
                    "high",
                    evidence=f"Set-Cookie: {cookies_header[:80]}",
                    recommendation="Add HttpOnly flag to all session cookies."
                ))
            if "secure" not in cookies_header.lower():
                threats.append(threat(
                    "Cookie Security",
                    "Cookie Missing Secure Flag",
                    "Cookies without Secure flag can be sent over HTTP connections.",
                    "medium",
                    evidence=f"Set-Cookie: {cookies_header[:80]}",
                    recommendation="Add Secure flag to all cookies."
                ))
            if "samesite" not in cookies_header.lower():
                threats.append(threat(
                    "Cookie Security",
                    "Cookie Missing SameSite Attribute",
                    "Without SameSite, cookies are sent in cross-site requests. Enables CSRF attacks.",
                    "medium",
                    evidence=f"Set-Cookie: {cookies_header[:80]}",
                    recommendation="Set SameSite=Strict or SameSite=Lax on cookies."
                ))

        return threats


def _csp_has_frame_ancestors(csp: str) -> bool:
    return bool(csp and "frame-ancestors" in csp)

def _truncate_directive(csp: str, keyword: str) -> str:
    idx = csp.find(keyword)
    if idx == -1:
        return ""
    start = max(0, idx - 30)
    end = min(len(csp), idx + 30)
    return csp[start:end]
