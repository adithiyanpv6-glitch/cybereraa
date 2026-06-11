from models import ScanRequest, Threat
from typing import List
import uuid

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

class DOMAnalyzer:
    @staticmethod
    def analyze(req: ScanRequest) -> List[Threat]:
        threats = []
        dom = req.domIndicators or {}

        # --- PROTOCOL ---
        if req.protocol == "http:" and req.domain not in ("localhost", "127.0.0.1"):
            threats.append(threat(
                "Transport Security",
                "Insecure HTTP Connection",
                "Page is served over unencrypted HTTP. Data in transit can be intercepted.",
                "high",
                evidence=f"Protocol: {req.protocol}",
                recommendation="Ensure the site uses HTTPS with a valid TLS certificate."
            ))

        # --- LOGIN PAGE OVER HTTP ---
        if dom.get("isLoginPage") and req.protocol == "http:":
            threats.append(threat(
                "Authentication",
                "Login Form Over HTTP",
                "Credentials will be transmitted in plaintext — vulnerable to MITM attacks.",
                "critical",
                recommendation="Never submit login forms on HTTP pages."
            ))

        # --- PAYMENT PAGE OVER HTTP ---
        if dom.get("isPaymentPage") and req.protocol == "http:":
            threats.append(threat(
                "Payment Security",
                "Payment Form Over HTTP",
                "Payment card data submitted over unencrypted channel.",
                "critical",
                recommendation="Payment pages must use HTTPS with valid TLS."
            ))

        # --- HIDDEN IFRAMES ---
        if dom.get("hasHiddenIframes"):
            threats.append(threat(
                "Malicious Content",
                "Hidden Iframes Detected",
                "Invisible iframes may be used for clickjacking, session riding, or loading malicious content.",
                "high",
                recommendation="Inspect hidden iframes for malicious intent."
            ))

        # --- META REFRESH REDIRECT ---
        if dom.get("hasMetaRefresh"):
            threats.append(threat(
                "Phishing Indicators",
                "Meta Refresh Redirect",
                "Page uses meta-refresh to redirect. Common in phishing pages to quickly redirect victims.",
                "medium",
                recommendation="Verify the redirect destination is legitimate."
            ))

        # --- OBJECT/EMBED TAGS ---
        if dom.get("hasObjectTags"):
            threats.append(threat(
                "Malicious Content",
                "Object/Embed Tags Present",
                "<object> and <embed> elements can load plugins (Flash, Java) that execute arbitrary code.",
                "medium",
                recommendation="Ensure embedded objects are from trusted sources."
            ))

        # --- BASE64 IN ATTRIBUTES ---
        if dom.get("hasBase64InAttributes"):
            threats.append(threat(
                "Obfuscation",
                "Base64 Encoded Content in Attributes",
                "Attributes contain large base64 encoded data, a common obfuscation technique in malicious pages.",
                "high",
                recommendation="Inspect base64 content for hidden malicious payloads."
            ))

        # --- DATA URI IMAGES ---
        if dom.get("hasDataUriImages"):
            threats.append(threat(
                "Obfuscation",
                "Data URI Images Detected",
                "Images loaded via data URIs can embed malicious content and bypass CSP image-src policies.",
                "low",
                evidence="img[src^=data:]",
                recommendation="Verify data URI images come from legitimate inline generation."
            ))

        # --- HIDDEN ELEMENTS WITH LINKS ---
        hidden = req.hiddenElements or []
        hidden_with_links = [e for e in hidden if e.get("hasLinks") or e.get("hasForms")]
        if hidden_with_links:
            threats.append(threat(
                "Phishing Indicators",
                f"Hidden Elements with Links/Forms ({len(hidden_with_links)})",
                "Page contains hidden elements with links or forms. May be used for SEO spam, phishing overlays, or credential harvesting.",
                "medium",
                evidence=f"Sample: {hidden_with_links[0].get('textPreview', '')[:80]}",
                recommendation="Review hidden interactive elements."
            ))

        # --- IFRAMES ANALYSIS ---
        iframes = req.iframes or []
        external_unsandboxed = [
            f for f in iframes
            if f.get("isExternal") and not f.get("isSandboxed") and not f.get("isHidden")
        ]
        if external_unsandboxed:
            threats.append(threat(
                "Iframe Security",
                f"Unsandboxed External Iframes ({len(external_unsandboxed)})",
                "External iframes without sandbox attribute have full access to the parent page context.",
                "medium",
                evidence=str([f.get("src", "")[:60] for f in external_unsandboxed[:2]]),
                recommendation="Add sandbox attribute to external iframes."
            ))

        payment_iframes = [
            f for f in iframes if f.get("hasAllowPaymentRequest")
        ]
        if payment_iframes:
            threats.append(threat(
                "Payment Security",
                "Iframe with Payment API Access",
                "An iframe has been granted access to the Payment Request API, which can trigger payment flows.",
                "high",
                evidence=str([f.get("src", "")[:60] for f in payment_iframes[:2]]),
                recommendation="Verify payment iframes belong to legitimate payment processors."
            ))

        # --- FORMS ANALYSIS ---
        forms = req.forms or []
        for form in forms:
            # Form posting to external domain
            if form.get("isExternalAction") and form.get("hasPasswordField"):
                threats.append(threat(
                    "Phishing",
                    "Password Form Submitting to External Domain",
                    "A login form is posting credentials to an external domain — strong phishing indicator.",
                    "critical",
                    evidence=f"Form action: {form.get('action', '')[:100]}",
                    recommendation="Do not enter credentials on this page."
                ))

            # HTTP form action with credentials
            if form.get("hasPasswordField") and not form.get("httpsAction") and form.get("action"):
                threats.append(threat(
                    "Authentication",
                    "Password Form With HTTP Action",
                    "Login form submits credentials over HTTP without encryption.",
                    "critical",
                    evidence=f"Action: {form.get('action', '')[:80]}",
                    recommendation="Never enter passwords on pages with HTTP form actions."
                ))

            # Autocomplete on password field
            password_inputs = [i for i in form.get("inputs", []) if i.get("type") == "password"]
            for pi in password_inputs:
                if pi.get("autocomplete") == "off":
                    threats.append(threat(
                        "Authentication",
                        "Autocomplete Disabled on Password Field",
                        "Disabling autocomplete on passwords encourages weak/reused passwords and may indicate a malicious form.",
                        "info",
                        recommendation="Use a password manager to fill credentials securely."
                    ))
                    break

        # --- INLINE EVENT HANDLERS ---
        handlers = req.inlineHandlers or []
        if handlers:
            threats.append(threat(
                "Script Injection",
                f"Suspicious Inline Event Handlers ({len(handlers)})",
                "Page contains suspicious inline event handlers that may execute malicious code.",
                "medium",
                evidence=f"Sample: {handlers[0].get('attribute', '')}={handlers[0].get('preview', '')[:60]}",
                recommendation="Inspect inline event handlers for malicious code execution."
            ))

        return threats
