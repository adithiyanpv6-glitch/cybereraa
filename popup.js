// Antigravity Popup Script

const SEVERITY_ICONS = {
  critical: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "🔵",
  info: "⚪",
};

let currentTabId = null;
let currentUrl = null;

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function setStatus(state, text) {
  const dot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");
  dot.className = `status-dot ${state}`;
  statusText.className = `status-text ${state}`;
  statusText.textContent = text;
}

function setLoading(isLoading) {
  const bar = document.getElementById("loadingBar");
  const btn = document.getElementById("scanBtn");
  bar.classList.toggle("hidden", !isLoading);
  btn.disabled = isLoading;
  btn.textContent = isLoading ? "Scanning…" : "Scan Now";
}

function renderThreats(threats) {
  const container = document.getElementById("threatsContainer");
  const statsRow = document.getElementById("statsRow");
  const scoreBadge = document.getElementById("scoreBadge");

  if (!threats || threats.length === 0) {
    statsRow.style.display = "none";
    scoreBadge.style.display = "none";
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🛡️</div>
        <div class="empty-title">No threats detected</div>
        <div class="empty-desc">This page looks clean. Stay vigilant!</div>
      </div>`;
    return;
  }

  // Count by severity
  const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const t of threats) counts[t.severity] = (counts[t.severity] || 0) + 1;

  document.getElementById("statCritical").textContent = counts.critical;
  document.getElementById("statHigh").textContent = counts.high;
  document.getElementById("statMedium").textContent = counts.medium;
  document.getElementById("statLow").textContent = counts.low + (counts.info || 0);
  statsRow.style.display = "flex";

  // Score badge
  const totalRisk = counts.critical * 4 + counts.high * 3 + counts.medium * 2 + counts.low;
  let level, levelClass;
  if (counts.critical > 0 || totalRisk >= 8) { level = "HIGH RISK"; levelClass = "danger"; }
  else if (counts.high > 0 || totalRisk >= 4) { level = "MEDIUM RISK"; levelClass = "warning"; }
  else { level = "LOW RISK"; levelClass = "safe"; }

  scoreBadge.textContent = level;
  scoreBadge.className = `score-badge ${levelClass}`;
  scoreBadge.style.display = "inline-block";

  // Group by category
  const byCategory = {};
  for (const t of threats) {
    if (!byCategory[t.category]) byCategory[t.category] = [];
    byCategory[t.category].push(t);
  }

  let html = "";
  for (const [cat, items] of Object.entries(byCategory)) {
    html += `<div class="section-label">${cat}</div>`;
    for (const item of items) {
      const icon = SEVERITY_ICONS[item.severity] || "⚪";
      html += `
        <div class="threat-item">
          <span class="threat-icon">${icon}</span>
          <div class="threat-body">
            <div class="threat-title">${escapeHtml(item.title)}</div>
            <div class="threat-desc">${escapeHtml(item.description)}</div>
          </div>
          <span class="sev-badge sev-${item.severity}">${item.severity}</span>
        </div>`;
    }
  }
  container.innerHTML = html;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatTime(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

async function triggerScan() {
  setLoading(true);
  setStatus("scanning", "Analyzing page…");

  try {
    await chrome.tabs.sendMessage(currentTabId, { type: "TRIGGER_SCAN" });
  } catch (err) {
    setStatus("idle", "Cannot scan this page");
    setLoading(false);
  }
}

async function init() {
  const tab = await getCurrentTab();
  if (!tab) return;

  currentTabId = tab.id;
  currentUrl = tab.url;

  const urlBar = document.getElementById("urlBar");
  urlBar.textContent = currentUrl || "Unknown page";

  // Check for cached result
  const stored = await chrome.storage.local.get([`result_${tab.id}`]);
  const cached = stored[`result_${tab.id}`];
  if (cached) {
    displayResult(cached);
  }

  // Listen for new results
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "SCAN_RESULT") {
      // Cache it
      chrome.storage.local.set({ [`result_${currentTabId}`]: msg.result });
      displayResult(msg.result);
    }
    if (msg.type === "SCAN_ERROR") {
      setLoading(false);
      setStatus("idle", `Error: ${msg.error}`);
    }
  });

  document.getElementById("scanBtn").addEventListener("click", triggerScan);
}

function displayResult(result) {
  setLoading(false);
  const threats = result.threats || [];
  const threatCount = threats.filter(t => t.severity !== "info").length;

  if (threatCount === 0) {
    setStatus("safe", "No threats detected");
  } else if (threats.some(t => t.severity === "critical" || t.severity === "high")) {
    setStatus("danger", `${threatCount} threat${threatCount > 1 ? "s" : ""} found`);
  } else {
    setStatus("warning", `${threatCount} warning${threatCount > 1 ? "s" : ""} found`);
  }

  document.getElementById("footerTime").textContent = formatTime(result.timestamp);
  renderThreats(threats);
}

init();
