from models import ScanRequest, Threat
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

# Known malware / tracking / suspicious domains
KNOWN_BAD_DOMAINS = {
    "coinhive.com", "coin-hive.com", "crypto-loot.com", "minero.cc",
    "jsecoin.com", "papoto.com", "cryptoloot.pro",
}

# IP-based tracking / sketchy analytics
SUSPICIOUS_PATTERNS = [
    r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}",  # Raw IP addresses
]

# Legitimate ad/tracking networks (for info-level, not threat)
TRACKING_DOMAINS = {
    "doubleclick.net", "googlesyndication.com", "googletagmanager.com",
    "google-analytics.com", "analytics.google.com", "facebook.net",
    "connect.facebook.net", "scorecardresearch.com", "quantserve.com",
    "adsystem.com", "adobedtm.com", "hotjar.com",
}


class NetworkAnalyzer:
    @staticmethod
    def analyze(req: ScanRequest) -> List[Threat]:
        threats = []
        domain = req.domain
        external_links = req.externalLinks or []
        integrity_checks = req.integrityChecks or []
        scripts = req.scripts or []

        # --- MALICIOUS DOMAINS ---
        bad_found = [d for d in external_links if d in KNOWN_BAD_DOMAINS]
        for script in scripts:
            src = script.get("src") or ""
            for bad in KNOWN_BAD_DOMAINS:
                if bad in src:
                    bad_found.append(src[:80])

        if bad_found:
            threats.append(threat(
                "Malicious Network",
                "Known Malicious Domain Detected",
                "Page loads resources from domains known to host malware or cryptomining scripts.",
                "critical",
                evidence="; ".join(bad_found[:3]),
                recommendation="Do not interact with this page. Report to Google Safe Browsing."
            ))

        # --- RAW IP IN SCRIPTS ---
        raw_ip_scripts = []
        for script in scripts:
            src = script.get("src") or ""
            for pattern in SUSPICIOUS_PATTERNS:
                if re.search(pattern, src):
                    raw_ip_scripts.append(src[:80])

        if raw_ip_scripts:
            threats.append(threat(
                "Suspicious Network",
                "Script Loaded From Raw IP Address",
                "Scripts served from raw IP addresses (not domain names) are highly suspicious.",
                "high",
                evidence="; ".join(raw_ip_scripts[:3]),
                recommendation="Legitimate services use domain names. Avoid executing scripts from raw IPs."
            ))

        # --- EXTERNAL SCRIPTS WITHOUT SRI (beyond script analyzer scope - network level) ---
        no_sri = [
            c for c in integrity_checks
            if not c.get("hasIntegrity") and c.get("type") == "SCRIPT"
        ]
        if len(no_sri) > 8:
            # Already covered in script analyzer, only flag extreme cases here
            threats.append(threat(
                "Supply Chain",
                f"High Volume of Unverified External Resources ({len(no_sri)})",
                "Large number of external scripts/styles without integrity verification increases supply chain attack surface.",
                "medium",
                evidence=f"Count: {len(no_sri)} resources",
                recommendation="Implement SRI for all external resources."
            ))

        # --- MIXED CONTENT ---
        if req.protocol == "https:":
            http_scripts = [
                s.get("src", "") for s in scripts
                if s.get("src", "").startswith("http://")
            ]
            if http_scripts:
                threats.append(threat(
                    "Transport Security",
                    f"Mixed Content — HTTP Scripts on HTTPS Page ({len(http_scripts)})",
                    "Scripts loaded over HTTP on an HTTPS page are not encrypted. Vulnerable to MitM injection.",
                    "high",
                    evidence=http_scripts[0][:80],
                    recommendation="Update all resource URLs to use HTTPS."
                ))

        # --- TRACKING INFO ---
        tracking = [l for l in external_links if any(t in l for t in TRACKING_DOMAINS)]
        if len(tracking) >= 3:
            threats.append(threat(
                "Privacy",
                f"Multiple Tracking/Analytics Services ({len(tracking)})",
                f"Page connects to {len(tracking)} advertising or analytics domains that track your behavior.",
                "info",
                evidence="; ".join(tracking[:5]),
                recommendation="Use a privacy-focused browser extension (uBlock Origin, Privacy Badger) to block trackers."
            ))

        # --- DATA EXFILTRATION VIA IMAGES (tracking pixels) ---
        # Look for 1x1 pixel patterns in external links
        # Not easily detectable at this level, but can look for known pixel domains
        pixel_domains = ["px.ads.linkedin.com", "t.co", "px.twitter.com",
                         "ad.doubleclick.net", "stats.g.doubleclick.net"]
        pixels_found = [d for d in external_links if any(p in d for p in pixel_domains)]
        if pixels_found:
            threats.append(threat(
                "Privacy",
                f"Tracking Pixels Detected ({len(pixels_found)})",
                "Tracking pixels report your page visit, IP address, and browser fingerprint to third parties.",
                "info",
                evidence="; ".join(pixels_found[:3]),
                recommendation="Use a content blocker to prevent tracking pixels."
            ))

        return threats
