import { useState, useEffect, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Threat {
  id: string;
  category: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  evidence?: string;
  recommendation?: string;
}

interface ScanResult {
  url: string;
  domain: string;
  timestamp: string;
  threats: Threat[];
  threat_count: number;
  risk_score: number;
  risk_level: string;
  ai_summary?: string;
  stats: Record<string, number>;
}

interface Stats {
  total_scans: number;
  total_threats: number;
  high_risk_sites: number;
  severity_breakdown: Record<string, number>;
  recent_domains: string[];
}

// ─── Constants ───────────────────────────────────────────────────────────────
const API = "http://localhost:8000";

const SEV_CONFIG = {
  critical: { color: "#ef4444", bg: "#450a0a", label: "CRITICAL", dot: "🔴" },
  high:     { color: "#f97316", bg: "#431407", label: "HIGH",     dot: "🟠" },
  medium:   { color: "#f59e0b", bg: "#451a03", label: "MEDIUM",   dot: "🟡" },
  low:      { color: "#22c55e", bg: "#14532d", label: "LOW",      dot: "🔵" },
  info:     { color: "#94a3b8", bg: "#1e293b", label: "INFO",     dot: "⚪" },
};

const RISK_COLORS = {
  safe: "#22c55e", low: "#22c55e", medium: "#f59e0b",
  high: "#f97316", critical: "#ef4444",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`;
  return `${Math.round(diff / 3600000)}h ago`;
}

function getRiskGrade(score: number) {
  if (score === 0) return "A+";
  if (score < 10) return "A";
  if (score < 20) return "B";
  if (score < 35) return "C";
  if (score < 60) return "D";
  return "F";
}

// ─── Components ──────────────────────────────────────────────────────────────

function ThreatBadge({ severity }: { severity: string }) {
  const cfg = SEV_CONFIG[severity as keyof typeof SEV_CONFIG] || SEV_CONFIG.info;
  return (
    <span style={{
      background: cfg.bg,
      color: cfg.color,
      fontSize: 9,
      fontWeight: 700,
      padding: "2px 6px",
      borderRadius: 4,
      textTransform: "uppercase",
      letterSpacing: "0.07em",
      flexShrink: 0,
    }}>{cfg.label}</span>
  );
}

function ThreatCard({ threat, expanded, onToggle }: {
  threat: Threat;
  expanded: boolean;
  onToggle: () => void;
}) {
  const cfg = SEV_CONFIG[threat.severity] || SEV_CONFIG.info;
  return (
    <div
      onClick={onToggle}
      style={{
        background: expanded ? "#0f172a" : "#0a0e1a",
        border: `1px solid ${expanded ? cfg.color + "44" : "#1e2a4a"}`,
        borderLeft: `3px solid ${cfg.color}`,
        borderRadius: 8,
        padding: "12px 14px",
        cursor: "pointer",
        transition: "all 0.15s",
        marginBottom: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{ fontSize: 14, marginTop: 1 }}>{cfg.dot}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{threat.category}</span>
            <ThreatBadge severity={threat.severity} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{threat.title}</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, lineHeight: 1.5 }}>
            {threat.description}
          </div>
          {expanded && (
            <div style={{ marginTop: 10 }}>
              {threat.evidence && (
                <div style={{
                  background: "#0f172a",
                  border: "1px solid #1e2a4a",
                  borderRadius: 6,
                  padding: "8px 10px",
                  fontFamily: "monospace",
                  fontSize: 11,
                  color: "#f97316",
                  marginBottom: 8,
                  wordBreak: "break-all",
                }}>
                  📋 {threat.evidence}
                </div>
              )}
              {threat.recommendation && (
                <div style={{
                  background: "#0c2a1a",
                  border: "1px solid #14532d",
                  borderRadius: 6,
                  padding: "8px 10px",
                  fontSize: 12,
                  color: "#86efac",
                }}>
                  💡 {threat.recommendation}
                </div>
              )}
            </div>
          )}
        </div>
        <span style={{ color: "#374151", fontSize: 10, marginTop: 3 }}>{expanded ? "▲" : "▼"}</span>
      </div>
    </div>
  );
}

function RiskGauge({ score, level }: { score: number; level: string }) {
  const color = RISK_COLORS[level as keyof typeof RISK_COLORS] || "#94a3b8";
  const grade = getRiskGrade(score);
  const dashOffset = 220 - (score / 100) * 220;

  return (
    <div style={{ textAlign: "center" }}>
      <svg width={120} height={70} viewBox="0 0 120 70">
        <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="#1e2a4a" strokeWidth={10} strokeLinecap="round" />
        <path
          d="M 10 60 A 50 50 0 0 1 110 60"
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray="220"
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.4s" }}
        />
        <text x="60" y="58" textAnchor="middle" fill={color} fontSize="22" fontWeight="700">{grade}</text>
      </svg>
      <div style={{ fontSize: 11, color: "#64748b", marginTop: -4 }}>Risk Score: {score}/100</div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div style={{
      background: "#0f172a",
      border: "1px solid #1e2a4a",
      borderRadius: 10,
      padding: "14px 16px",
      flex: 1,
    }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || "#a5b4fc", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 4 }}>{label}</div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [selected, setSelected] = useState<ScanResult | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [expandedThreats, setExpandedThreats] = useState<Set<string>>(new Set());
  const [filterSev, setFilterSev] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"threats" | "details" | "ai">("threats");
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [histRes, statsRes] = await Promise.all([
        fetch(`${API}/api/history?limit=30`),
        fetch(`${API}/api/stats`),
      ]);
      if (!histRes.ok || !statsRes.ok) throw new Error("Backend unreachable");
      const histData = await histRes.json();
      const statsData = await statsRes.json();
      setHistory(histData.scans || []);
      setStats(statsData);
      if (histData.scans?.length > 0 && !selected) {
        setSelected(histData.scans[0]);
      }
    } catch (e: any) {
      setError("Cannot reach backend. Make sure the FastAPI server is running on port 8000.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Auto-refresh every 5s
    return () => clearInterval(interval);
  }, [fetchData]);

  const filteredThreats = (selected?.threats || []).filter(
    t => filterSev === "all" || t.severity === filterSev
  );

  const toggleThreat = (id: string) => {
    setExpandedThreats(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const sevCounts = selected?.threats.reduce((acc, t) => {
    acc[t.severity] = (acc[t.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div style={{
      minHeight: "100vh",
      background: "#060a14",
      color: "#e2e8f0",
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* ── Header ── */}
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
        borderBottom: "1px solid #1e2a4a",
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        height: 56,
        gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16,
          }}>⚡</div>
          <span style={{
            fontSize: 17, fontWeight: 800,
            background: "linear-gradient(90deg, #a5b4fc, #c4b5fd)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: -0.5,
          }}>ANTIGRAVITY</span>
          <span style={{ fontSize: 10, color: "#475569", fontWeight: 600, letterSpacing: 1 }}>WEB THREAT SCANNER</span>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 11, color: loading ? "#6366f1" : "#22c55e",
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%",
              background: loading ? "#6366f1" : "#22c55e",
              boxShadow: `0 0 6px ${loading ? "#6366f1" : "#22c55e"}`,
              animation: loading ? "pulse 1s infinite" : "none",
            }} />
            {loading ? "Syncing…" : "Live"}
          </div>
          <button
            onClick={fetchData}
            style={{
              background: "#1e2a4a", border: "1px solid #2d3a5a",
              color: "#94a3b8", padding: "5px 12px", borderRadius: 6,
              fontSize: 12, cursor: "pointer",
            }}
          >↻ Refresh</button>
        </div>
      </div>

      {error && (
        <div style={{
          background: "#450a0a", borderBottom: "1px solid #ef4444",
          padding: "10px 24px", fontSize: 13, color: "#fca5a5",
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Main Layout ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── Left sidebar: stats + history ── */}
        <div style={{
          width: 280, borderRight: "1px solid #1e2a4a",
          background: "#080c16", display: "flex", flexDirection: "column",
          overflowY: "auto", flexShrink: 0,
        }}>
          {/* Global stats */}
          {stats && (
            <div style={{ padding: "16px 14px", borderBottom: "1px solid #1e2a4a" }}>
              <div style={{ fontSize: 10, color: "#475569", fontWeight: 700, letterSpacing: 1, marginBottom: 10, textTransform: "uppercase" }}>
                Session Summary
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <StatCard label="Pages Scanned" value={stats.total_scans} />
                <StatCard label="Threats Found" value={stats.total_threats} color="#f87171" />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <StatCard label="High Risk" value={stats.high_risk_sites} color="#f97316" />
                <StatCard label="Critical" value={stats.severity_breakdown?.critical || 0} color="#ef4444" />
              </div>
            </div>
          )}

          {/* Scan history */}
          <div style={{ padding: "12px 14px 6px", fontSize: 10, color: "#475569", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
            Recent Scans
          </div>
          {history.length === 0 ? (
            <div style={{ padding: "20px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
              <div style={{ fontSize: 12, color: "#475569" }}>No scans yet. Install the extension and visit any website.</div>
            </div>
          ) : (
            history.map(scan => {
              const riskColor = RISK_COLORS[scan.risk_level as keyof typeof RISK_COLORS] || "#94a3b8";
              const isActive = selected?.url === scan.url && selected?.timestamp === scan.timestamp;
              return (
                <div
                  key={`${scan.url}-${scan.timestamp}`}
                  onClick={() => { setSelected(scan); setActiveTab("threats"); setExpandedThreats(new Set()); }}
                  style={{
                    padding: "10px 14px",
                    borderBottom: "1px solid #0f172a",
                    cursor: "pointer",
                    background: isActive ? "#0f172a" : "transparent",
                    borderLeft: isActive ? `3px solid #6366f1` : "3px solid transparent",
                    transition: "all 0.1s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>
                      {scan.domain}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      color: riskColor,
                      background: riskColor + "22",
                      padding: "1px 6px", borderRadius: 4,
                    }}>{scan.risk_level.toUpperCase()}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#475569" }}>
                    <span>{scan.threat_count} threat{scan.threat_count !== 1 ? "s" : ""}</span>
                    <span>{timeAgo(scan.timestamp)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Right panel: scan detail ── */}
        <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
          {!selected ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60%", gap: 16 }}>
              <div style={{ fontSize: 60 }}>🛡️</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#334155" }}>No scan selected</div>
              <div style={{ fontSize: 14, color: "#475569", textAlign: "center", maxWidth: 360 }}>
                Install the Antigravity browser extension and visit any website to see real-time threat analysis here.
              </div>
            </div>
          ) : (
            <>
              {/* Page header */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                  <RiskGauge score={selected.risk_score} level={selected.risk_level} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: "#475569", fontWeight: 700, letterSpacing: 1, marginBottom: 4, textTransform: "uppercase" }}>
                      {timeAgo(selected.timestamp)}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#e2e8f0", marginBottom: 4, wordBreak: "break-all" }}>
                      {selected.domain}
                    </div>
                    <div style={{ fontSize: 11, color: "#475569", marginBottom: 10, wordBreak: "break-all" }}>
                      {selected.url.length > 80 ? selected.url.substring(0, 80) + "…" : selected.url}
                    </div>

                    {/* Severity breakdown */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {(["critical", "high", "medium", "low", "info"] as const).map(sev => {
                        const count = sevCounts[sev] || 0;
                        if (count === 0) return null;
                        const cfg = SEV_CONFIG[sev];
                        return (
                          <div key={sev} style={{
                            background: cfg.bg, color: cfg.color,
                            padding: "3px 10px", borderRadius: 6,
                            fontSize: 11, fontWeight: 700,
                          }}>
                            {count} {cfg.label}
                          </div>
                        );
                      })}
                      {selected.threat_count === 0 && (
                        <div style={{
                          background: "#14532d", color: "#86efac",
                          padding: "3px 10px", borderRadius: 6,
                          fontSize: 11, fontWeight: 700,
                        }}>✓ CLEAN</div>
                      )}
                    </div>
                  </div>

                  {/* Quick stats */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, minWidth: 180 }}>
                    {Object.entries(selected.stats || {}).map(([k, v]) => (
                      <div key={k} style={{
                        background: "#0f172a", border: "1px solid #1e2a4a",
                        borderRadius: 8, padding: "8px 10px", textAlign: "center",
                      }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#a5b4fc" }}>{v}</div>
                        <div style={{ fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: 0.5 }}>
                          {k.replace(/_/g, " ")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: 2, marginBottom: 16, borderBottom: "1px solid #1e2a4a", paddingBottom: 0 }}>
                {([
                  ["threats", `Threats (${selected.threats.length})`],
                  ["details", "Page Details"],
                  ...(selected.ai_summary ? [["ai", "🤖 AI Analysis"]] : []),
                ] as [string, string][]).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id as any)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      padding: "8px 14px", fontSize: 13, fontWeight: 600,
                      color: activeTab === id ? "#a5b4fc" : "#64748b",
                      borderBottom: activeTab === id ? "2px solid #6366f1" : "2px solid transparent",
                      marginBottom: -1, transition: "color 0.15s",
                    }}
                  >{label}</button>
                ))}
              </div>

              {/* Tab content */}
              {activeTab === "threats" && (
                <div>
                  {/* Filter */}
                  <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                    {["all", "critical", "high", "medium", "low", "info"].map(sev => (
                      <button
                        key={sev}
                        onClick={() => setFilterSev(sev)}
                        style={{
                          background: filterSev === sev ? "#1e2a4a" : "transparent",
                          border: `1px solid ${filterSev === sev ? "#6366f1" : "#1e2a4a"}`,
                          color: filterSev === sev ? "#a5b4fc" : "#64748b",
                          padding: "4px 10px", borderRadius: 6, fontSize: 11,
                          fontWeight: 600, cursor: "pointer", textTransform: "uppercase",
                        }}
                      >
                        {sev === "all" ? `All (${selected.threats.length})` : `${sev} (${sevCounts[sev] || 0})`}
                      </button>
                    ))}
                  </div>

                  {filteredThreats.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0" }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>🛡️</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "#22c55e" }}>No threats detected</div>
                      <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>This page appears clean.</div>
                    </div>
                  ) : (
                    filteredThreats.map(threat => (
                      <ThreatCard
                        key={threat.id}
                        threat={threat}
                        expanded={expandedThreats.has(threat.id)}
                        onToggle={() => toggleThreat(threat.id)}
                      />
                    ))
                  )}
                </div>
              )}

              {activeTab === "details" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div style={{ background: "#0f172a", border: "1px solid #1e2a4a", borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: 10, color: "#6366f1", fontWeight: 700, letterSpacing: 1, marginBottom: 12, textTransform: "uppercase" }}>Page Info</div>
                    {[
                      ["URL", selected.url.length > 50 ? selected.url.substring(0, 50) + "…" : selected.url],
                      ["Domain", selected.domain],
                      ["Scanned", new Date(selected.timestamp).toLocaleString()],
                      ["Risk Level", selected.risk_level.toUpperCase()],
                      ["Risk Score", `${selected.risk_score}/100`],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #1e2a4a", fontSize: 12 }}>
                        <span style={{ color: "#64748b" }}>{k}</span>
                        <span style={{ color: "#e2e8f0", fontWeight: 500 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: "#0f172a", border: "1px solid #1e2a4a", borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: 10, color: "#6366f1", fontWeight: 700, letterSpacing: 1, marginBottom: 12, textTransform: "uppercase" }}>Scan Statistics</div>
                    {Object.entries(selected.stats || {}).map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #1e2a4a", fontSize: 12 }}>
                        <span style={{ color: "#64748b" }}>{k.replace(/_/g, " ")}</span>
                        <span style={{ color: "#a5b4fc", fontWeight: 600 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "ai" && selected.ai_summary && (
                <div style={{
                  background: "linear-gradient(135deg, #0f172a, #1e1b4b)",
                  border: "1px solid #3730a3",
                  borderRadius: 12, padding: 24,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <div style={{
                      width: 36, height: 36, background: "#6366f1",
                      borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 18,
                    }}>🤖</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#a5b4fc" }}>AI Security Assessment</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>Powered by Groq / Llama 3.1</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.7, color: "#cbd5e1" }}>
                    {selected.ai_summary}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        * { box-sizing: border-box; }
        body { margin: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #060a14; }
        ::-webkit-scrollbar-thumb { background: #1e2a4a; border-radius: 3px; }
      `}</style>
    </div>
  );
}
