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

# Known malicious/suspicious CDN patterns
SUSPICIOUS_DOMAINS = [
    "coinhive.com", "coin-hive.com", "crypto-loot.com", "minero.cc",
    "jsecoin.com", "papoto.com", "miner.pr0gramm.com",
]

# Known safe CDNs (reduce false positives)
TRUSTED_CDNS = [
    "cdn.jsdelivr.net", "cdnjs.cloudflare.com", "unpkg.com",
    "ajax.googleapis.com", "code.jquery.com", "stackpath.bootstrapcdn.com",
    "maxcdn.bootstrapcdn.com", "use.fontawesome.com", "fonts.googleapis.com",
    "fonts.gstatic.com", "cdn.tailwindcss.com",
]

class ScriptAnalyzer:
    @staticmethod
    def analyze(req: ScanRequest) -> List[Threat]:
        threats = []
        scripts = req.scripts or []

        if not scripts:
            return threats

        external_without_integrity = []
        crypto_mining_scripts = []
        eval_scripts = []
        obfuscated_scripts = []
        exfil_scripts = []
        inline_scripts_with_issues = []

        for s in scripts:
            src = s.get("src") or ""
            is_inline = s.get("isInline", False)
            is_external = s.get("isExternal", False)
            has_integrity = s.get("hasIntegrity", False)
            patterns = s.get("suspiciousPatterns", [])
            preview = s.get("inlinePreview", "") or ""

            pattern_names = [p["name"] for p in patterns]

            # External scripts without SRI
            if is_external and not has_integrity:
                # Skip trusted CDNs if low risk
                domain = ""
                try:
                    from urllib.parse import urlparse
                    domain = urlparse(src).netloc
                except:
                    pass

                if domain not in TRUSTED_CDNS:
                    external_without_integrity.append(src[:80])

            # Crypto mining
            if any(d in src for d in SUSPICIOUS_DOMAINS):
                crypto_mining_scripts.append(src[:80])
            if "crypto_mining" in pattern_names:
                crypto_mining_scripts.append(f"inline script: {preview[:60]}")

            # Eval usage
            if "eval_usage" in pattern_names:
                eval_scripts.append(preview[:80])

            # Obfuscation
            if "obfuscated_hex" in pattern_names or "obfuscated_unicode" in pattern_names:
                obfuscated_scripts.append(f"inline ({s.get('inlineLength', 0)} bytes)")
            elif "fromCharCode" in pattern_names and "base64_decode" in pattern_names:
                obfuscated_scripts.append(f"inline multi-encoding ({s.get('inlineLength', 0)} bytes)")

            # Exfiltration patterns
            if "exfil_pattern" in pattern_names or "keylogger_pattern" in pattern_names:
                exfil_scripts.append(preview[:80])

            # Collect other inline issues
            other_patterns = [p for p in patterns
                if p["name"] not in ("eval_usage", "obfuscated_hex", "obfuscated_unicode",
                                     "fromCharCode", "exfil_pattern", "keylogger_pattern",
                                     "crypto_mining")]
            if other_patterns and is_inline:
                for p in other_patterns:
                    inline_scripts_with_issues.append({
                        "pattern": p["name"],
                        "severity": p["severity"],
                        "preview": preview[:60],
                    })

        # --- BUILD THREATS ---

        if crypto_mining_scripts:
            threats.append(threat(
                "Cryptojacking",
                "Cryptocurrency Mining Script Detected",
                "Page loads scripts known to mine cryptocurrency using visitor's CPU without consent.",
                "critical",
                evidence="; ".join(crypto_mining_scripts[:3]),
                recommendation="Leave this site immediately. Report to your admin/browser."
            ))

        if exfil_scripts:
            threats.append(threat(
                "Data Exfiltration",
                "Potential Data Exfiltration Script",
                "Inline script contains patterns that may read cookies or form data and send it externally.",
                "critical",
                evidence=exfil_scripts[0],
                recommendation="Do not enter any personal information on this page."
            ))

        if obfuscated_scripts:
            threats.append(threat(
                "Obfuscation",
                f"Obfuscated JavaScript Detected ({len(obfuscated_scripts)} script(s))",
                "Heavily encoded or obfuscated JavaScript is a common malware delivery technique.",
                "high",
                evidence=obfuscated_scripts[0],
                recommendation="Use a JS deobfuscator to inspect the real code before proceeding."
            ))

        if eval_scripts:
            threats.append(threat(
                "Script Injection Risk",
                f"eval() Usage in Inline Scripts ({len(eval_scripts)} instance(s))",
                "eval() executes strings as code. Unsafe use enables code injection attacks.",
                "medium",
                evidence=eval_scripts[0],
                recommendation="eval() should never be used with user-supplied or external data."
            ))

        if len(external_without_integrity) > 5:
            threats.append(threat(
                "Supply Chain",
                f"External Scripts Without Integrity Checks ({len(external_without_integrity)})",
                "Scripts loaded from external sources without Subresource Integrity (SRI) hashes. If the CDN is compromised, malicious code runs on this page.",
                "medium",
                evidence="; ".join(external_without_integrity[:3]),
                recommendation="Ask the site owner to add integrity= attributes to script tags."
            ))

        # Report individual inline pattern issues (grouped)
        severity_map = {}
        for item in inline_scripts_with_issues:
            sev = item["severity"]
            if sev not in severity_map:
                severity_map[sev] = []
            severity_map[sev].append(item)

        for sev, items in severity_map.items():
            pattern_names = list({i["pattern"] for i in items})
            threats.append(threat(
                "Script Patterns",
                f"Suspicious Script Patterns: {', '.join(pattern_names[:3])}",
                f"Inline scripts contain {len(items)} pattern(s) that may indicate malicious behavior.",
                sev,
                evidence=items[0]["preview"],
                recommendation="Review inline JavaScript for malicious functionality."
            ))

        return threats
