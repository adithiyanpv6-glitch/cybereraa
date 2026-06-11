// Antigravity Content Script
// Runs on every page - collects security-relevant data and sends to backend

(function () {
  "use strict";

  const BACKEND_URL = "http://localhost:8000";

  function collectPageData() {
    const data = {
      url: window.location.href,
      domain: window.location.hostname,
      protocol: window.location.protocol,
      timestamp: new Date().toISOString(),
      title: document.title,

      // --- SCRIPTS ---
      scripts: collectScripts(),

      // --- FORMS ---
      forms: collectForms(),

      // --- IFRAMES ---
      iframes: collectIframes(),

      // --- META & HEADERS ---
      meta: collectMeta(),

      // --- LINKS ---
      externalLinks: collectExternalLinks(),

      // --- DOM INDICATORS ---
      domIndicators: collectDomIndicators(),

      // --- COOKIES (accessible ones) ---
      cookies: document.cookie ? document.cookie.split(";").map(c => c.trim()) : [],

      // --- INLINE EVENT HANDLERS ---
      inlineHandlers: collectInlineHandlers(),

      // --- HIDDEN ELEMENTS ---
      hiddenElements: collectHiddenElements(),

      // --- RESOURCE INTEGRITY ---
      integrityChecks: collectIntegrityChecks(),
    };

    return data;
  }

  function collectScripts() {
    const scripts = [];
    document.querySelectorAll("script").forEach((s) => {
      const entry = {
        src: s.src || null,
        isInline: !s.src,
        isExternal: s.src ? !s.src.includes(window.location.hostname) : false,
        hasIntegrity: !!s.integrity,
        integrity: s.integrity || null,
        crossOrigin: s.crossOrigin || null,
        type: s.type || "text/javascript",
        async: s.async,
        defer: s.defer,
        inlineLength: !s.src ? s.innerHTML.length : 0,
        // Check for suspicious patterns in inline scripts
        suspiciousPatterns: !s.src ? detectSuspiciousJS(s.innerHTML) : [],
        // First 500 chars of inline for analysis
        inlinePreview: !s.src ? s.innerHTML.substring(0, 500) : null,
      };
      scripts.push(entry);
    });
    return scripts;
  }

  function detectSuspiciousJS(code) {
    const patterns = [
      { name: "eval_usage", regex: /\beval\s*\(/, severity: "high" },
      { name: "document_write", regex: /document\.write\s*\(/, severity: "medium" },
      { name: "base64_decode", regex: /atob\s*\(|btoa\s*\(/, severity: "medium" },
      { name: "obfuscated_hex", regex: /\\x[0-9a-fA-F]{2}\\x[0-9a-fA-F]{2}/, severity: "high" },
      { name: "obfuscated_unicode", regex: /\\u[0-9a-fA-F]{4}\\u[0-9a-fA-F]{4}/, severity: "high" },
      { name: "fromCharCode", regex: /String\.fromCharCode/, severity: "medium" },
      { name: "crypto_mining", regex: /coinhive|cryptonight|minero|monero|hashrate|CoinMiner/i, severity: "critical" },
      { name: "keylogger_pattern", regex: /keydown|keyup|keypress.*document\.cookie|password/i, severity: "high" },
      { name: "exfil_pattern", regex: /fetch\(.*cookie|xmlhttprequest.*cookie/i, severity: "high" },
      { name: "prompt_injection", regex: /ignore previous|disregard instructions|system prompt/i, severity: "medium" },
      { name: "data_uri", regex: /data:text\/html|data:application\/javascript/i, severity: "medium" },
      { name: "iframe_injection", regex: /createElement.*iframe|insertAdjacentHTML/i, severity: "medium" },
      { name: "clipboard_access", regex: /navigator\.clipboard|clipboardData/i, severity: "low" },
      { name: "geolocation", regex: /navigator\.geolocation/i, severity: "low" },
      { name: "webrtc_leak", regex: /RTCPeerConnection|webkitRTCPeerConnection/i, severity: "low" },
    ];

    const found = [];
    for (const p of patterns) {
      if (p.regex.test(code)) {
        found.push({ name: p.name, severity: p.severity });
      }
    }
    return found;
  }

  function collectForms() {
    const forms = [];
    document.querySelectorAll("form").forEach((f) => {
      const actionUrl = f.action || "";
      const isExternalAction =
        actionUrl && !actionUrl.includes(window.location.hostname) && actionUrl.startsWith("http");

      const inputs = Array.from(f.querySelectorAll("input, textarea, select")).map((i) => ({
        type: i.type || "text",
        name: i.name || null,
        id: i.id || null,
        autocomplete: i.autocomplete || null,
        hasPasswordField: i.type === "password",
      }));

      forms.push({
        action: actionUrl,
        method: f.method || "get",
        isExternalAction,
        enctype: f.enctype,
        hasPasswordField: inputs.some((i) => i.hasPasswordField),
        hasFileUpload: inputs.some((i) => i.type === "file"),
        inputCount: inputs.length,
        inputs,
        isInsideIframe: window !== window.top,
        httpsAction: actionUrl.startsWith("https://") || actionUrl === "",
      });
    });
    return forms;
  }

  function collectIframes() {
    const iframes = [];
    document.querySelectorAll("iframe").forEach((f) => {
      iframes.push({
        src: f.src || null,
        isExternal: f.src ? !f.src.includes(window.location.hostname) : false,
        isSandboxed: f.hasAttribute("sandbox"),
        sandbox: f.sandbox || null,
        allowAttributes: f.allow || null,
        isHidden: f.style.display === "none" || f.style.visibility === "hidden" ||
          f.offsetWidth === 0 || f.offsetHeight === 0,
        width: f.width,
        height: f.height,
        loading: f.loading,
        hasAllowFullscreen: f.allowFullscreen,
        hasAllowPaymentRequest: f.allow && f.allow.includes("payment"),
      });
    });
    return iframes;
  }

  function collectMeta() {
    const meta = {};
    document.querySelectorAll("meta").forEach((m) => {
      const name = m.name || m.httpEquiv || m.property;
      if (name) meta[name] = m.content;
    });

    // Check for CSP in meta tag
    meta._hasMetaCSP = !!document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    meta._hasXFrameOptions = !!document.querySelector('meta[http-equiv="X-Frame-Options"]');
    meta._hasReferrerPolicy = !!document.querySelector('meta[name="referrer"]');

    return meta;
  }

  function collectExternalLinks() {
    const links = new Set();
    document.querySelectorAll("a[href]").forEach((a) => {
      try {
        const url = new URL(a.href, window.location.href);
        if (url.hostname !== window.location.hostname) {
          links.add(url.hostname);
        }
      } catch (_) {}
    });
    return Array.from(links).slice(0, 50); // cap at 50
  }

  function collectDomIndicators() {
    return {
      totalElements: document.getElementsByTagName("*").length,
      hasPasswordInput: !!document.querySelector('input[type="password"]'),
      hasCreditCardInput: !!document.querySelector(
        'input[autocomplete*="cc"], input[name*="card"], input[placeholder*="card"]'
      ),
      hasFileInput: !!document.querySelector('input[type="file"]'),
      hasHiddenIframes: !!document.querySelector(
        'iframe[style*="display:none"], iframe[style*="visibility:hidden"]'
      ),
      hasDataUriImages: Array.from(document.querySelectorAll("img")).some(
        (i) => i.src && i.src.startsWith("data:")
      ),
      hasObjectTags: !!document.querySelector("object, embed"),
      hasMetaRefresh: !!document.querySelector('meta[http-equiv="refresh"]'),
      hasBase64InAttributes: checkBase64InAttributes(),
      pageTextLength: document.body ? document.body.innerText.length : 0,
      isLoginPage: detectLoginPage(),
      isPaymentPage: detectPaymentPage(),
    };
  }

  function checkBase64InAttributes() {
    const allElements = document.querySelectorAll("[src],[href],[action],[data]");
    for (const el of allElements) {
      for (const attr of ["src", "href", "action", "data"]) {
        const val = el.getAttribute(attr) || "";
        if (val.startsWith("data:") && val.length > 200) return true;
      }
    }
    return false;
  }

  function detectLoginPage() {
    const hasPassword = !!document.querySelector('input[type="password"]');
    const loginKeywords = /login|sign.?in|log.?in|authenticate|account/i;
    return hasPassword || loginKeywords.test(document.title) || loginKeywords.test(window.location.href);
  }

  function detectPaymentPage() {
    const paymentKeywords = /checkout|payment|billing|card|purchase|order/i;
    const hasCreditCard = !!document.querySelector(
      'input[autocomplete*="cc"], input[name*="card-number"], input[name*="cardnumber"]'
    );
    return hasCreditCard || paymentKeywords.test(document.title) || paymentKeywords.test(window.location.href);
  }

  function collectInlineHandlers() {
    const suspicious = [];
    const handlerAttrs = ["onclick", "onmouseover", "onload", "onerror", "onfocus", "onblur",
      "onchange", "onsubmit", "onkeydown", "onkeyup", "onkeypress"];

    document.querySelectorAll("*").forEach((el) => {
      for (const attr of handlerAttrs) {
        const val = el.getAttribute(attr);
        if (val && (val.includes("eval(") || val.includes("document.write") ||
          val.includes("atob(") || val.length > 200)) {
          suspicious.push({
            element: el.tagName,
            attribute: attr,
            preview: val.substring(0, 100),
            length: val.length,
          });
        }
      }
    });
    return suspicious.slice(0, 20);
  }

  function collectHiddenElements() {
    const hidden = [];
    document.querySelectorAll('[style*="display:none"],[style*="visibility:hidden"],[style*="opacity:0"]').forEach((el) => {
      if (el.tagName !== "SCRIPT" && el.tagName !== "STYLE") {
        const text = el.innerText || el.textContent || "";
        if (text.trim().length > 10) {
          hidden.push({
            tag: el.tagName,
            textPreview: text.substring(0, 100),
            hasLinks: !!el.querySelector("a"),
            hasForms: !!el.querySelector("form"),
          });
        }
      }
    });
    return hidden.slice(0, 10);
  }

  function collectIntegrityChecks() {
    const resources = [];
    document.querySelectorAll("script[src], link[rel=stylesheet]").forEach((el) => {
      const src = el.src || el.href;
      if (src && !src.includes(window.location.hostname)) {
        resources.push({
          type: el.tagName,
          src,
          hasIntegrity: !!el.integrity,
          crossOrigin: el.crossOrigin || null,
        });
      }
    });
    return resources.slice(0, 30);
  }

  // --- SEND TO BACKEND ---
  async function sendToBackend(data) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      // Send result to extension popup via chrome runtime
      chrome.runtime.sendMessage({
        type: "SCAN_RESULT",
        url: data.url,
        result,
      });
      return result;
    } catch (err) {
      chrome.runtime.sendMessage({
        type: "SCAN_ERROR",
        url: data.url,
        error: err.message,
      });
    }
  }

  // --- ENTRY POINT ---
  // Wait for page to be ready, then scan
  function runScan() {
    const pageData = collectPageData();
    // Store locally too
    chrome.storage.local.set({
      lastScan: { url: pageData.url, timestamp: pageData.timestamp, status: "scanning" },
    });
    sendToBackend(pageData);
  }

  // Run after a short delay to let dynamic content load
  if (document.readyState === "complete") {
    setTimeout(runScan, 1500);
  } else {
    window.addEventListener("load", () => setTimeout(runScan, 1500));
  }

  // Also listen for messages from popup requesting a fresh scan
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "TRIGGER_SCAN") {
      runScan();
    }
  });
})();
