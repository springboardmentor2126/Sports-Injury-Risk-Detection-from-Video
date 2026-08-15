"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { authApi, athleteApi, videoApi, getToken, AnalysisHistoryItem, AthleteListItem } from "@/lib/api";
import GlobalChatbot from "@/components/GlobalChatbot";

const RISK_CONFIG = {
  low:      { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", label: "Low Risk" },
  moderate: { color: "#d97706", bg: "#fef3c7", border: "#fde68a", label: "Moderate Risk" },
  high:     { color: "#dc2626", bg: "#fee2e2", border: "#fecaca", label: "High Risk" },
  critical: { color: "#7c3aed", bg: "#ede9fe", border: "#ddd6fe", label: "Critical Risk" },
};

interface User { first_name: string; last_name: string; role: { name: string }; }

// Athlete-only overview
function AthleteOverview({ user, loading, history, hasProfile }: {
  user: User | null; loading: boolean; history: AnalysisHistoryItem[]; hasProfile: boolean | null;
}) {
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const totalVideos = history.length;
  const latestRisk  = history[0]?.risk_level ?? null;
  const riskConf    = latestRisk ? RISK_CONFIG[latestRisk as keyof typeof RISK_CONFIG] : null;
  const riskAlerts  = history.filter(h => h.risk_level && h.risk_level !== "low").length;
  const avgSymmetry = (() => {
    const vals = history.map(h => h.avg_overall_symmetry).filter(v => v != null) as number[];
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 100);
  })();

  const stats = [
    { label: "Videos Analysed", value: loading ? "..." : String(totalVideos), desc: "Total sessions", color: "#2563eb" },
    { label: "Risk Alerts", value: loading ? "..." : String(riskAlerts), desc: "Sessions with elevated risk", color: riskAlerts > 0 ? "#dc2626" : "#16a34a" },
    { label: "Avg Symmetry", value: loading ? "..." : (avgSymmetry != null ? `${avgSymmetry}%` : "--"), desc: "Movement balance", color: avgSymmetry != null && avgSymmetry < 75 ? "#d97706" : "#16a34a" },
    { label: "Latest Risk", value: loading ? "..." : (riskConf?.label ?? "No data"), desc: "Most recent session", color: riskConf?.color ?? "#94a3b8" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>Welcome back, {user?.first_name ?? "Athlete"}</h1>
        <p style={{ color: "#64748b", fontSize: "14px" }}>{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
      </div>
      {hasProfile === false && (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "10px", padding: "16px 20px", marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <p style={{ fontWeight: 600, fontSize: "14px", color: "#1e40af", marginBottom: "3px" }}>Complete your athlete profile</p>
            <p style={{ fontSize: "13px", color: "#3b82f6" }}>Add your sport and physical stats for personalised analysis.</p>
          </div>
          <Link href="/dashboard/profile" className="sg-btn sg-btn-primary" style={{ fontSize: "13px", padding: "8px 16px" }}>Set Up Profile</Link>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {stats.map(s => (
          <div key={s.label} className="sg-card">
            <p style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>{s.label}</p>
            <p style={{ fontSize: "24px", fontWeight: 800, color: s.color, lineHeight: 1, marginBottom: "4px" }}>{s.value}</p>
            <p style={{ fontSize: "12px", color: "#94a3b8" }}>{s.desc}</p>
          </div>
        ))}
      </div>

      {/* ── My AI Recommendations — expandable per-session plan ── */}
      <div className="sg-card" style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", margin: 0 }}>📋 My AI Recommendations</h2>
            <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "3px" }}>Click any session to view your personalised corrective plan</p>
          </div>
          <Link href="/dashboard/analyze" style={{ fontSize: "12px", color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>+ New Analysis</Link>
        </div>
        {loading ? <p style={{ fontSize: "13px", color: "#94a3b8" }}>Loading...</p>
          : history.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <p style={{ fontSize: "14px", color: "#64748b", fontWeight: 500 }}>No analyses yet</p>
              <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "16px" }}>Upload a video to get your first AI corrective plan.</p>
              <Link href="/dashboard/analyze" className="sg-btn sg-btn-primary" style={{ fontSize: "13px", padding: "8px 18px" }}>Analyse First Video</Link>
            </div>
          ) : history.map(h => {
            const rc = h.risk_level ? RISK_CONFIG[h.risk_level as keyof typeof RISK_CONFIG] : null;
            const date = h.created_at ? new Date(h.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "--";
            const isOpen = expandedSession === h.session_id;
            const plan = h.ai_recommendations;
            return (
              <div key={h.session_id} style={{ border: "1px solid", borderColor: isOpen ? "#ddd6fe" : "#f1f5f9", borderRadius: "10px", marginBottom: "8px", overflow: "hidden", transition: "all 0.2s" }}>
                {/* Session row header */}
                <button
                  onClick={() => setExpandedSession(isOpen ? null : h.session_id)}
                  style={{ width: "100%", textAlign: "left", padding: "12px 16px", background: isOpen ? "#faf5ff" : "#fff", border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", flexShrink: 0, background: rc?.color ?? "#94a3b8" }} />
                  <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.filename ?? "Untitled Session"}</p>
                    <p style={{ fontSize: "11px", color: "#94a3b8", margin: 0 }}>{date}</p>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", background: rc?.bg ?? "#f1f5f9", color: rc?.color ?? "#64748b", flexShrink: 0 }}>{rc?.label ?? "--"}</span>
                  <span style={{ fontSize: "14px", color: "#94a3b8", flexShrink: 0, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
                </button>

                {/* Expanded AI Plan */}
                {isOpen && (
                  <div style={{ padding: "16px", borderTop: "1px solid #f1f5f9", background: "#fff" }}>
                    {!plan ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#7c3aed" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}>
                          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                        </svg>
                        <p style={{ fontSize: "13px", color: "#7c3aed", margin: 0 }}>AI plan is being generated — check back shortly.</p>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                        {/* Exercises */}
                        <div>
                          <p style={{ fontSize: "11px", fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>💪 Exercises</p>
                          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                            {plan.exercise_recommendations?.map((e: string, i: number) => (
                              <li key={i} style={{ fontSize: "12px", color: "#374151", padding: "5px 0", borderBottom: "1px solid #f1f5f9", display: "flex", gap: "6px" }}>
                                <span style={{ color: "#7c3aed", flexShrink: 0 }}>•</span>{e}
                              </li>
                            ))}
                          </ul>
                        </div>
                        {/* Mobility */}
                        <div>
                          <p style={{ fontSize: "11px", fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>🧘 Mobility</p>
                          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                            {plan.mobility_suggestions?.map((e: string, i: number) => (
                              <li key={i} style={{ fontSize: "12px", color: "#374151", padding: "5px 0", borderBottom: "1px solid #f1f5f9", display: "flex", gap: "6px" }}>
                                <span style={{ color: "#16a34a", flexShrink: 0 }}>•</span>{e}
                              </li>
                            ))}
                          </ul>
                        </div>
                        {/* Recovery */}
                        <div>
                          <p style={{ fontSize: "11px", fontWeight: 700, color: "#d97706", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>🔄 Recovery</p>
                          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                            {plan.recovery_planning?.map((e: string, i: number) => (
                              <li key={i} style={{ fontSize: "12px", color: "#374151", padding: "5px 0", borderBottom: "1px solid #f1f5f9", display: "flex", gap: "6px" }}>
                                <span style={{ color: "#d97706", flexShrink: 0 }}>•</span>{e}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        }
      </div>

      {/* Quick Actions */}
      <div className="sg-card">
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", marginBottom: "14px" }}>Quick Actions</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <Link href="/dashboard/analyze" className="sg-btn sg-btn-primary" style={{ fontSize: "13px", padding: "10px 12px", justifyContent: "flex-start", gap: "8px" }}>Analyse New Video</Link>
          <Link href="/dashboard/profile" className="sg-btn sg-btn-ghost" style={{ fontSize: "13px", padding: "10px 12px", justifyContent: "flex-start", gap: "8px" }}>Update Profile</Link>
        </div>
      </div>
    </div>
  );
}

// Team overview for coach / physio / scientist
function TeamOverview({ user, loading, athletes }: {
  user: User | null; loading: boolean; athletes: AthleteListItem[];
}) {
  const role = user?.role?.name ?? "";
  const highRisk = athletes.filter(a => a.latest_risk === "high" || a.latest_risk === "critical").length;
  const avgSym = (() => {
    const vals = athletes.map(a => a.latest_symmetry).filter(v => v != null) as number[];
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 100);
  })();

  const roleLabels: Record<string, { title: string; sub: string }> = {
    coach:           { title: "Team Dashboard", sub: "Monitor your athletes injury risk and performance" },
    physiotherapist: { title: "Patient Dashboard", sub: "Clinical movement data for rehabilitation planning" },
    scientist:{ title: "Research Dashboard", sub: "Aggregate biomechanical data across all athletes" },
  };
  const { title, sub } = roleLabels[role] ?? { title: "Dashboard", sub: "" };

  return (
    <div>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>{title}</h1>
        <p style={{ color: "#64748b", fontSize: "14px" }}>{sub}</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {[
          { label: "Total Athletes", value: loading ? "..." : String(athletes.length), color: "#2563eb" },
          { label: "High / Critical Risk", value: loading ? "..." : String(highRisk), color: highRisk > 0 ? "#dc2626" : "#16a34a" },
          { label: "Avg Symmetry", value: loading ? "..." : (avgSym != null ? `${avgSym}%` : "--"), color: avgSym != null && avgSym < 75 ? "#d97706" : "#16a34a" },
          { label: "Need Attention", value: loading ? "..." : String(highRisk), color: highRisk > 0 ? "#d97706" : "#16a34a" },
        ].map(s => (
          <div key={s.label} className="sg-card">
            <p style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>{s.label}</p>
            <p style={{ fontSize: "24px", fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</p>
          </div>
        ))}
      </div>
      <div className="sg-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>Athletes at a Glance</h2>
          <Link href="/dashboard/athletes" style={{ fontSize: "12px", color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>View All</Link>
        </div>
        {loading ? <p style={{ fontSize: "13px", color: "#94a3b8" }}>Loading...</p>
          : athletes.length === 0 ? (
            <p style={{ textAlign: "center", color: "#94a3b8", fontSize: "14px", padding: "24px 0" }}>No athletes on the platform yet.</p>
          ) : [...athletes].sort((a, b) => {
            const order = { critical: 0, high: 1, moderate: 2, low: 3 };
            return (order[a.latest_risk as keyof typeof order] ?? 4) - (order[b.latest_risk as keyof typeof order] ?? 4);
          }).slice(0, 6).map(a => {
            const rc = a.latest_risk ? RISK_CONFIG[a.latest_risk as keyof typeof RISK_CONFIG] : null;
            const sym = a.latest_symmetry != null ? Math.round(a.latest_symmetry * 100) : null;
            return (
              <Link key={a.user_id} href={`/dashboard/athletes/${a.user_id}`} style={{ textDecoration: "none", display: "block" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "10px 8px", borderBottom: "1px solid #f1f5f9", borderRadius: "6px", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f8fafc"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                  <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 700, fontSize: "13px", color: "#475569" }}>
                    {a.first_name[0]}{a.last_name[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a", marginBottom: "2px" }}>{a.first_name} {a.last_name}</p>
                    <p style={{ fontSize: "12px", color: "#94a3b8" }}>{a.sport_type ?? "No sport"} {a.session_count} session{a.session_count !== 1 ? "s" : ""}</p>
                  </div>
                  {rc && <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", background: rc.bg, color: rc.color, flexShrink: 0 }}>{rc.label}</span>}
                  {sym != null && <span style={{ fontSize: "12px", color: "#64748b", flexShrink: 0 }}>{sym}% sym</span>}
                </div>
              </Link>
            );
          })
        }
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [user, setUser]             = useState<User | null>(null);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [history, setHistory]       = useState<AnalysisHistoryItem[]>([]);
  const [athletes, setAthletes]     = useState<AthleteListItem[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    if (!getToken()) return;
    authApi.getMe().then(u => {
      setUser(u);
      const role = u.role?.name ?? "athlete";
      if (role === "athlete") {
        Promise.allSettled([
          athleteApi.getProfile().then(() => setHasProfile(true)).catch(() => setHasProfile(false)),
          videoApi.getHistory().then(setHistory).catch(() => setHistory([])),
        ]).finally(() => setLoading(false));
      } else {
        athleteApi.getAllAthletes().then(setAthletes).catch(() => setAthletes([]))
          .finally(() => setLoading(false));
      }
    }).catch(() => setLoading(false));
  }, []);

  const role = user?.role?.name ?? "athlete";
  return (
    <>
      {role === "athlete" ? (
        <AthleteOverview user={user} loading={loading} history={history} hasProfile={hasProfile} />
      ) : (
        <TeamOverview user={user} loading={loading} athletes={athletes} />
      )}
      <GlobalChatbot 
        viewerRole={role} 
        athleteFirstName={user?.first_name} 
        contextType="dashboard" 
      />
    </>
  );
}
