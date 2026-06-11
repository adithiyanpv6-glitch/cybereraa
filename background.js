// Antigravity Background Service Worker
// Intercepts HTTP headers and tracks network requests

const BACKEND_URL = "http://localhost:8000";

// Store headers per tab
const tabHeaders = {};
const tabRequests = {};

// Intercept response headers
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (details.type !== "main_frame") return;

    const headers = {};
    for (const h of details.responseHeaders || []) {
      headers[h.name.toLowerCase()] = h.value;
    }

    // Security-relevant headers
    const securityHeaders = {
      "content-security-policy": headers["content-security-policy"] || null,
      "x-frame-options": headers["x-frame-options"] || null,
      "x-content-type-options": headers["x-content-type-options"] || null,
      "strict-transport-security": headers["strict-transport-security"] || null,
      "x-xss-protection": headers["x-xss-protection"] || null,
      "referrer-policy": headers["referrer-policy"] || null,
      "permissions-policy": headers["permissions-policy"] || null,
      "cross-origin-opener-policy": headers["cross-origin-opener-policy"] || null,
      "cross-origin-resource-policy": headers["cross-origin-resource-policy"] || null,
      "cross-origin-embedder-policy": headers["cross-origin-embedder-policy"] || null,
      "x-powered-by": headers["x-powered-by"] || null,
      "server": headers["server"] || null,
      "set-cookie": headers["set-cookie"] || null,
      "cache-control": headers["cache-control"] || null,
      "access-control-allow-origin": headers["access-control-allow-origin"] || null,
    };

    tabHeaders[details.tabId] = {
      url: details.url,
      statusCode: details.statusCode,
      headers: securityHeaders,
      timestamp: new Date().toISOString(),
    };

    // Send headers to backend
    sendHeadersToBackend(details.tabId, details.url, securityHeaders, details.statusCode);
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders", "extraHeaders"]
);

// Track all network requests per tab
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (!tabRequests[details.tabId]) {
      tabRequests[details.tabId] = [];
    }

    const url = details.url;
    let domain = "";
    try {
      domain = new URL(url).hostname;
    } catch (_) {}

    // Only track interesting requests
    if (details.type !== "image" && details.type !== "font") {
      tabRequests[details.tabId].push({
        url: url.substring(0, 200),
        domain,
        type: details.type,
        method: details.method,
        timestamp: new Date().toISOString(),
      });
    }

    // Cap at 100 requests
    if (tabRequests[details.tabId].length > 100) {
      tabRequests[details.tabId] = tabRequests[details.tabId].slice(-100);
    }
  },
  { urls: ["<all_urls>"] }
);

async function sendHeadersToBackend(tabId, url, headers, statusCode) {
  try {
    await fetch(`${BACKEND_URL}/api/headers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tabId, url, headers, statusCode }),
    });
  } catch (_) {}
}

// Clean up tab data when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabHeaders[tabId];
  delete tabRequests[tabId];
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_HEADERS") {
    sendResponse(tabHeaders[msg.tabId] || null);
  }

  if (msg.type === "GET_REQUESTS") {
    sendResponse(tabRequests[msg.tabId] || []);
  }

  if (msg.type === "SCAN_RESULT" || msg.type === "SCAN_ERROR") {
    // Forward to popup if open
    chrome.runtime.sendMessage(msg).catch(() => {});
    // Update badge
    if (msg.type === "SCAN_RESULT") {
      const threats = msg.result?.threat_count || 0;
      const color = threats === 0 ? "#22c55e" : threats < 3 ? "#f59e0b" : "#ef4444";
      chrome.action.setBadgeText({ text: threats > 0 ? String(threats) : "✓" });
      chrome.action.setBadgeBackgroundColor({ color });
    } else {
      chrome.action.setBadgeText({ text: "!" });
      chrome.action.setBadgeBackgroundColor({ color: "#6b7280" });
    }
  }
});
