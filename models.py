from pydantic import BaseModel, Field
from typing import Optional, Any

class ScriptEntry(BaseModel):
    src: Optional[str] = None
    isInline: bool = False
    isExternal: bool = False
    hasIntegrity: bool = False
    integrity: Optional[str] = None
    crossOrigin: Optional[str] = None
    type: str = "text/javascript"
    async_: Optional[bool] = Field(None, alias="async")
    defer: Optional[bool] = None
    inlineLength: int = 0
    suspiciousPatterns: list[dict] = []
    inlinePreview: Optional[str] = None

    class Config:
        populate_by_name = True

class FormEntry(BaseModel):
    action: str = ""
    method: str = "get"
    isExternalAction: bool = False
    enctype: str = ""
    hasPasswordField: bool = False
    hasFileUpload: bool = False
    inputCount: int = 0
    inputs: list[dict] = []
    isInsideIframe: bool = False
    httpsAction: bool = True

class IframeEntry(BaseModel):
    src: Optional[str] = None
    isExternal: bool = False
    isSandboxed: bool = False
    sandbox: Optional[str] = None
    allowAttributes: Optional[str] = None
    isHidden: bool = False
    width: Optional[str] = None
    height: Optional[str] = None
    hasAllowFullscreen: bool = False
    hasAllowPaymentRequest: bool = False

class DomIndicators(BaseModel):
    totalElements: int = 0
    hasPasswordInput: bool = False
    hasCreditCardInput: bool = False
    hasFileInput: bool = False
    hasHiddenIframes: bool = False
    hasDataUriImages: bool = False
    hasObjectTags: bool = False
    hasMetaRefresh: bool = False
    hasBase64InAttributes: bool = False
    pageTextLength: int = 0
    isLoginPage: bool = False
    isPaymentPage: bool = False

class ScanRequest(BaseModel):
    url: str
    domain: str = ""
    protocol: str = "https:"
    timestamp: Optional[str] = None
    title: str = ""
    scripts: list[dict] = []
    forms: list[dict] = []
    iframes: list[dict] = []
    meta: dict = {}
    externalLinks: list[str] = []
    domIndicators: dict = {}
    cookies: list[str] = []
    inlineHandlers: list[dict] = []
    hiddenElements: list[dict] = []
    integrityChecks: list[dict] = []

class HeaderRequest(BaseModel):
    tabId: Optional[int] = None
    url: str
    statusCode: int = 200
    headers: dict[str, Optional[str]] = {}

class Threat(BaseModel):
    id: str
    category: str
    title: str
    description: str
    severity: str  # critical | high | medium | low | info
    evidence: Optional[str] = None
    recommendation: Optional[str] = None

class ScanResult(BaseModel):
    url: str
    domain: str
    timestamp: str
    threats: list[Threat]
    threat_count: int
    risk_score: int
    risk_level: str
    ai_summary: Optional[str] = None
    stats: dict = {}
