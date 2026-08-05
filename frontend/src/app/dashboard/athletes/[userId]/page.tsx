"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import { videoApi, authApi, athleteApi, getToken, AnalysisHistoryItem, chatApi } from "@/lib/api";
import GlobalChatbot from "@/components/GlobalChatbot";

// ─── Config ──────────────────────────────────────────────────────────────────
const RISK_CONFIG = {
  low:      { color: "#16a34a", bg: "#f0fdf4", label: "Low Risk",      score: 1 },
  moderate: { color: "#d97706", bg: "#fef3c7", label: "Moderate Risk", score: 2 },
  high:     { color: "#dc2626", bg: "#fee2e2", label: "High Risk",     score: 3 },
  critical: { color: "#7c3aed", bg: "#ede9fe", label: "Critical Risk", score: 4 },
};

const TRAINING_STATUS: Record<string, { label: string; desc: string; color: string; bg: string; icon: string }> = {
  low:      { label: "Ready for Training",      desc: "Biomechanics are within safe range. Full training load approved.",     color: "#16a34a", bg: "#f0fdf4", icon: "✅" },
  moderate: { label: "Monitor Workload",         desc: "Some risk indicators detected. Reduce high-impact drills, watch load.", color: "#d97706", bg: "#fef9ec", icon: "⚠️" },
  high:     { label: "Reduce Intensity",         desc: "Significant risk flags. Limit explosive movements, review technique.",  color: "#dc2626", bg: "#fff5f5", icon: "🔴" },
  critical: { label: "Rest / Consult Physio",   desc: "Critical risk detected. Do not train until cleared by physiotherapist.", color: "#7c3aed", bg: "#f5f3ff", icon: "🚨" },
};

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface AthleteInfo {
  first_name: string; last_name: string; email: string; sport_type: string | null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SymBar({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null;
  const pct = Math.round(value * 100);
  const color = pct >= 85 ? "#16a34a" : pct >= 70 ? "#d97706" : "#dc2626";
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontSize: "12px", color: "#64748b" }}>{label}</span>
        <span style={{ fontSize: "12px", fontWeight: 700, color }}>{pct}%</span>
      </div>
      <div style={{ height: "7px", background: "#f1f5f9", borderRadius: "4px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "4px", transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

function AngleStat({ label, value, warn }: { label: string; value: number | null; warn?: boolean }) {
  if (value == null) return null;
  return (
    <div style={{ background: warn ? "#fef9ec" : "#f8fafc", borderRadius: "8px", padding: "10px 14px", textAlign: "center", border: `1px solid ${warn ? "#fde68a" : "#e2e8f0"}` }}>
      <p style={{ fontSize: "19px", fontWeight: 800, color: warn ? "#d97706" : "#0f172a", lineHeight: 1, marginBottom: "4px" }}>{value.toFixed(1)}&deg;</p>
      <p style={{ fontSize: "11px", color: "#94a3b8" }}>{label}</p>
      {warn && <p style={{ fontSize: "10px", color: "#d97706", marginTop: "2px", fontWeight: 600 }}>⚠ Flag</p>}
    </div>
  );
}

function FlagRow({ label, frames, total }: { label: string; frames: number; total: number }) {
  if (!frames) return null;
  const pct = total > 0 ? Math.round(frames / total * 100) : 0;
  const isCritical = pct > 30;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: isCritical ? "#dc2626" : "#d97706", flexShrink: 0, display: "inline-block" }} />
      <span style={{ flex: 1, fontSize: "13px", color: "#374151" }}>{label}</span>
      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
        <div style={{ width: "60px", height: "5px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: isCritical ? "#dc2626" : "#d97706", borderRadius: "3px" }} />
        </div>
        <span style={{ fontSize: "12px", fontWeight: 700, color: isCritical ? "#dc2626" : "#d97706", minWidth: "70px", textAlign: "right" }}>{frames} fr ({pct}%)</span>
      </div>
    </div>
  );
}

// Custom recharts tooltip
function TrendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "10px 14px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", fontSize: "12px" }}>
      <p style={{ fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: "flex", justifyContent: "space-between", gap: "16px", color: p.color, fontWeight: 600 }}>
          <span>{p.name}</span><span>{p.value}{p.dataKey === "symmetry" ? "%" : ""}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Trend Chart ─────────────────────────────────────────────────────────────
function TrendChart({ history }: { history: AnalysisHistoryItem[] }) {
  // Each data point = one uploaded video, ordered oldest → newest
  const data = [...history].reverse().map((h, i) => {
    // Shorten filename: strip extension, cap at 12 chars
    const raw = h.filename?.replace(/\.[^.]+$/, "") ?? `Session ${i + 1}`;
    const label = raw.length > 12 ? raw.slice(0, 11) + "…" : raw;
    return {
      label,
      fullName: h.filename ?? `Session ${i + 1}`,
      date: h.created_at ? new Date(h.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "",
      risk: RISK_CONFIG[h.risk_level as keyof typeof RISK_CONFIG]?.score ?? null,
      symmetry: h.avg_overall_symmetry != null ? Math.round(h.avg_overall_symmetry * 100) : null,
    };
  });

  return (
    <div className="sg-card" style={{ marginBottom: "16px" }}>
      <p style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
        Performance Trend
      </p>
      <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "16px" }}>Each point = one uploaded video. Risk score (1=Low → 4=Critical) and symmetry % over time.</p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: -20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} angle={-25} textAnchor="end" interval={0} />
          <YAxis yAxisId="risk" domain={[0, 4]} tick={{ fontSize: 11, fill: "#94a3b8" }} tickCount={5}
            tickFormatter={(v) => ["", "Low", "Mod", "High", "Crit"][v] ?? ""} />
          <YAxis yAxisId="sym" orientation="right" domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} unit="%" />
          <Tooltip content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const d = data.find(x => x.label === label);
            return (
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "10px 14px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", fontSize: "12px" }}>
                <p style={{ fontWeight: 700, color: "#0f172a", marginBottom: "2px" }}>{d?.fullName ?? label}</p>
                <p style={{ color: "#94a3b8", marginBottom: "6px" }}>{d?.date}</p>
                {payload.map((p: any) => (
                  <div key={p.dataKey} style={{ display: "flex", justifyContent: "space-between", gap: "16px", color: p.color, fontWeight: 600 }}>
                    <span>{p.name}</span><span>{p.value}{p.dataKey === "symmetry" ? "%" : ""}</span>
                  </div>
                ))}
              </div>
            );
          }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px", color: "#64748b", paddingTop: "8px" }} />
          <ReferenceLine yAxisId="risk" y={2.5} stroke="#fde68a" strokeDasharray="4 4" />
          <Line yAxisId="risk" type="monotone" dataKey="risk" name="Risk Level" stroke="#dc2626"
            strokeWidth={2.5} dot={{ r: 4, fill: "#dc2626", strokeWidth: 0 }} connectNulls />
          <Line yAxisId="sym" type="monotone" dataKey="symmetry" name="Symmetry" stroke="#2563eb"
            strokeWidth={2.5} dot={{ r: 4, fill: "#2563eb", strokeWidth: 0 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Raw Feature Matrix (Scientist only) ─────────────────────────────────────
function RawFeatureMatrix({ session }: { session: AnalysisHistoryItem }) {
  const avgKnee = session.avg_left_knee_angle != null && session.avg_right_knee_angle != null
    ? ((session.avg_left_knee_angle + session.avg_right_knee_angle) / 2)
    : null;
  const avgHip = session.avg_left_hip_angle != null && session.avg_right_hip_angle != null
    ? ((session.avg_left_hip_angle + session.avg_right_hip_angle) / 2)
    : null;
  const avgElbow = session.avg_left_elbow_angle != null && session.avg_right_elbow_angle != null
    ? ((session.avg_left_elbow_angle + session.avg_right_elbow_angle) / 2)
    : null;

  const features = [
    { name: "sport_encoded",       value: session.sport_type_used ?? "OTHER",                                         unit: "",   note: "Label-encoded sport type" },
    { name: "knee_flexion",        value: avgKnee?.toFixed(1) ?? "—",                                                 unit: "°",  note: "Avg bilateral knee angle" },
    { name: "hip_angle",           value: avgHip?.toFixed(1) ?? "—",                                                  unit: "°",  note: "Avg bilateral hip angle" },
    { name: "elbow_angle",         value: avgElbow?.toFixed(1) ?? "—",                                                unit: "°",  note: "Avg bilateral elbow angle" },
    { name: "shoulder_rotation",   value: session.avg_shoulder_rotation?.toFixed(1) ?? "—",                           unit: "°",  note: "Avg shoulder rotation" },
    { name: "trunk_lean",          value: session.avg_trunk_lean?.toFixed(1) ?? "—",                                  unit: "°",  note: "Avg trunk lean angle" },
    { name: "knee_valgus_angle",   value: session.avg_knee_valgus_angle?.toFixed(1) ?? "—",                           unit: "°",  note: "XGBoost top feature (33.8%)" },
    { name: "symmetry",            value: session.avg_overall_symmetry != null ? (session.avg_overall_symmetry * 100).toFixed(1) : "—", unit: "%", note: "Overall bilateral symmetry" },
    { name: "flag_knee_hyperext",  value: (session.frames_knee_hyperextension ?? 0) > 0 ? "1" : "0",                  unit: "",   note: "Any hyperextension frames?" },
    { name: "flag_knee_valgus",    value: (session.frames_knee_valgus ?? 0) > 0 ? "1" : "0",                          unit: "",   note: "XGBoost 2nd feature (25.2%)" },
    { name: "flag_trunk_lean",     value: (session.frames_excessive_trunk_lean ?? 0) > 0 ? "1" : "0",                 unit: "",   note: "Any excessive trunk lean?" },
    { name: "flag_low_symmetry",   value: (session.frames_low_symmetry ?? 0) > 0 ? "1" : "0",                         unit: "",   note: "Any low symmetry frames?" },
  ];

  return (
    <div className="sg-card">
      <p style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
        🔬 Raw Feature Matrix — XGBoost Inputs
      </p>
      <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "14px" }}>
        Exact 12 values fed into the model for this session
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
        {features.map((f) => (
          <div key={f.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#f8fafc", borderRadius: "7px", border: "1px solid #e2e8f0" }}>
            <div>
              <p style={{ fontSize: "11px", fontFamily: "monospace", color: "#475569", fontWeight: 700, margin: 0 }}>{f.name}</p>
              <p style={{ fontSize: "10px", color: "#94a3b8", margin: 0 }}>{f.note}</p>
            </div>
            <span style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a", marginLeft: "8px", flexShrink: 0 }}>
              {f.value}{f.unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AthleteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [athleteInfo, setAthleteInfo] = useState<AthleteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewerRole, setViewerRole] = useState("coach");
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [injuries, setInjuries] = useState<any[]>([]);
  const [showTrend, setShowTrend] = useState(false);

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    authApi.getMe().then(u => {
      const r = u.role?.name ?? "athlete";
      setViewerRole(r);
      if (r === "athlete") { router.push("/dashboard"); return; }
      athleteApi.getAllAthletes().then(list => {
        const a = list.find(x => x.user_id === userId);
        if (a) setAthleteInfo({ first_name: a.first_name, last_name: a.last_name, email: a.email, sport_type: a.sport_type });
      }).catch(() => {});
      videoApi.getAthleteHistory(userId)
        .then(h => { setHistory(h); if (h.length > 0) setExpandedSession(h[0].session_id); })
        .catch(() => setHistory([]))
        .finally(() => setLoading(false));
      athleteApi.getAthleteInjuries(userId)
        .then(setInjuries)
        .catch(() => setInjuries([]));
    }).catch(() => router.push("/login"));
  }, [userId, router]);

  const expanded = history.find(h => h.session_id === expandedSession);
  const rc = expanded?.risk_level ? RISK_CONFIG[expanded.risk_level as keyof typeof RISK_CONFIG] : null;
  const ts = expanded?.risk_level ? TRAINING_STATUS[expanded.risk_level] : null;

  return (
    <div>
      {/* Back nav */}
      <Link href="/dashboard/athletes" style={{ fontSize: "13px", color: "#2563eb", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px", marginBottom: "20px" }}>
        &larr; Back to Athletes
      </Link>

      {/* Athlete header */}
      {athleteInfo && (
        <div className="sg-card" style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "18px", color: "#475569", flexShrink: 0 }}>
            {athleteInfo.first_name[0]}{athleteInfo.last_name[0]}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", margin: 0 }}>{athleteInfo.first_name} {athleteInfo.last_name}</h1>
            <p style={{ fontSize: "13px", color: "#94a3b8", marginTop: "3px" }}>{athleteInfo.sport_type ?? "No sport"} &bull; {athleteInfo.email}</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#64748b" }}>{history.length} session{history.length !== 1 ? "s" : ""}</span>
              {history.length > 1 && (
                <button
                  onClick={() => setShowTrend(t => !t)}
                  style={{ fontSize: "11px", fontWeight: 600, padding: "4px 12px", borderRadius: "20px", border: "1px solid #e2e8f0", background: showTrend ? "#eff6ff" : "#f8fafc", color: showTrend ? "#2563eb" : "#64748b", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
                >
                  {showTrend ? "Hide Trend" : "📈 Show Trend"}
                </button>
              )}
            </div>
            <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 10px", borderRadius: "20px", background: "#f1f5f9", color: "#64748b", textTransform: "capitalize" }}>
              Viewing as {viewerRole}
            </span>
          </div>
        </div>
      )}

      {/* Injury History */}
      {injuries.length > 0 && (
        <div className="sg-card" style={{ marginBottom: "20px", borderLeft: "4px solid #dc2626" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>Past Injuries &amp; Medical History</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {injuries.map(inj => (
              <div key={inj.id} style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <p style={{ fontWeight: 600, fontSize: "14px", color: "#0f172a", marginBottom: "2px" }}>
                  {inj.injury_name} <span style={{ color: "#64748b", fontWeight: 400 }}>({inj.affected_body_part})</span>
                </p>
                <p style={{ fontSize: "13px", color: "#64748b" }}>
                  {new Date(inj.injury_date).toLocaleDateString()}
                  {inj.recovery_duration_weeks ? ` · Recovery: ${inj.recovery_duration_weeks} weeks` : ""}
                </p>
                {inj.notes && <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>Note: {inj.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session content */}
      {loading ? (
        <p style={{ color: "#94a3b8" }}>Loading sessions...</p>
      ) : history.length === 0 ? (
        <div className="sg-card" style={{ textAlign: "center", padding: "48px 0" }}>
          <p style={{ fontSize: "16px", color: "#64748b", fontWeight: 500 }}>No analysis sessions yet</p>
        </div>
      ) : (
        <div>
          {/* ── Trend Chart — shown only when toggled ── */}
          {history.length > 1 && showTrend && <TrendChart history={history} />}

          <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: "16px", alignItems: "start" }}>
            {/* Session sidebar */}
            <div className="sg-card" style={{ padding: "8px" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", padding: "6px 8px", marginBottom: "4px" }}>Sessions</p>
              {history.map(h => {
                const hrc = h.risk_level ? RISK_CONFIG[h.risk_level as keyof typeof RISK_CONFIG] : null;
                const isActive = expandedSession === h.session_id;
                return (
                  <button key={h.session_id} onClick={() => setExpandedSession(h.session_id)}
                    style={{ width: "100%", textAlign: "left", padding: "10px", borderRadius: "7px", border: "none", cursor: "pointer", fontFamily: "inherit", background: isActive ? "#eff6ff" : "transparent", marginBottom: "2px" }}>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: isActive ? "#1d4ed8" : "#0f172a", marginBottom: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {h.filename ?? "Untitled"}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {hrc && <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "20px", background: hrc.bg, color: hrc.color }}>{hrc.label}</span>}
                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                        {h.created_at ? new Date(h.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "--"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Session detail panel */}
            {expanded && (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

                {/* Session header card (all roles) */}
                <div className="sg-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
                    <div>
                      <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>{expanded.filename ?? "Session"}</h2>
                      <p style={{ fontSize: "13px", color: "#94a3b8" }}>
                        {expanded.created_at ? new Date(expanded.created_at).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "--"}
                        &nbsp;&bull;&nbsp;{expanded.duration_seconds?.toFixed(1)}s
                        &nbsp;&bull;&nbsp;{expanded.pose_detection_rate}% pose
                      </p>
                    </div>
                    {rc && <span style={{ fontSize: "13px", fontWeight: 700, padding: "6px 16px", borderRadius: "20px", background: rc.bg, color: rc.color }}>{rc.label}</span>}
                  </div>

                  {/* Movement Symmetry — all roles */}
                  <div style={{ marginBottom: "16px" }}>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>Movement Symmetry</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                      <SymBar label="Overall" value={expanded.avg_overall_symmetry} />
                      <SymBar label="Knee" value={expanded.avg_knee_symmetry} />
                      <SymBar label="Hip" value={expanded.avg_hip_symmetry} />
                    </div>
                  </div>

                  {/* ── COACH EXCLUSIVE ── Training Status + Quick Stats */}
                  {viewerRole === "coach" && ts && (
                    <div>
                      <div style={{ padding: "14px 16px", borderRadius: "10px", background: ts.bg, border: `1.5px solid ${ts.color}30`, marginBottom: "14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                          <span style={{ fontSize: "20px" }}>{ts.icon}</span>
                          <p style={{ fontWeight: 800, fontSize: "15px", color: ts.color, margin: 0 }}>{ts.label}</p>
                        </div>
                        <p style={{ fontSize: "13px", color: "#64748b", margin: 0, paddingLeft: "30px" }}>{ts.desc}</p>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                        <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "10px 12px", textAlign: "center", border: "1px solid #e2e8f0" }}>
                          <p style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a", margin: 0 }}>{expanded.frames_analyzed ?? "—"}</p>
                          <p style={{ fontSize: "11px", color: "#94a3b8" }}>Frames Analysed</p>
                        </div>
                        <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "10px 12px", textAlign: "center", border: "1px solid #e2e8f0" }}>
                          <p style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a", margin: 0 }}>{expanded.pose_detection_rate ?? "—"}%</p>
                          <p style={{ fontSize: "11px", color: "#94a3b8" }}>Pose Quality</p>
                        </div>
                        <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "10px 12px", textAlign: "center", border: "1px solid #e2e8f0" }}>
                          <p style={{ fontSize: "18px", fontWeight: 800, color: (expanded.avg_trunk_lean ?? 0) > 25 ? "#dc2626" : "#0f172a", margin: 0 }}>
                            {expanded.avg_trunk_lean?.toFixed(1) ?? "—"}°
                          </p>
                          <p style={{ fontSize: "11px", color: "#94a3b8" }}>Trunk Lean</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── PHYSIO & SCIENTIST ── XGBoost Model Confidence (no probability bars) */}
                  {(viewerRole === "physiotherapist" || viewerRole === "scientist") && expanded.xgboost_confidence != null && (
                    <div style={{ padding: "14px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "center" }}>
                      <div>
                        <p style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>🤖 AI Model Confidence</p>
                        <p style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a", margin: 0 }}>{((expanded.xgboost_confidence ?? 0) * 100).toFixed(1)}%</p>
                      </div>
                      <div style={{ borderLeft: "1px solid #e2e8f0", paddingLeft: "20px" }}>
                        <p style={{ fontSize: "11px", color: "#64748b", margin: 0 }}>Sport Profile</p>
                        <p style={{ fontSize: "14px", fontWeight: 700, color: "#475569", margin: 0 }}>{(expanded.sport_type_used ?? "--").replace("_", " ")}</p>
                      </div>
                      <div style={{ borderLeft: "1px solid #e2e8f0", paddingLeft: "20px" }}>
                        <p style={{ fontSize: "11px", color: "#64748b", margin: 0 }}>Verdict</p>
                        <p style={{ fontSize: "14px", fontWeight: 700, color: rc?.color ?? "#0f172a", margin: 0 }}>{rc?.label ?? "—"}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── PHYSIO & SCIENTIST ONLY ── Clinical Joint Angles */}
                {(viewerRole === "physiotherapist" || viewerRole === "scientist") && (
                  <div className="sg-card">
                    <p style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "14px" }}>
                      Joint Angles — Clinical ROM
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "12px" }}>
                      <div>
                        <p style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.05em" }}>Left Side</p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                          <AngleStat label="Knee Avg" value={expanded.avg_left_knee_angle} />
                          <AngleStat label="Knee Min" value={expanded.min_left_knee_angle} warn={(expanded.min_left_knee_angle ?? 180) < 60} />
                          <AngleStat label="Hip Avg" value={expanded.avg_left_hip_angle} />
                          <AngleStat label="Elbow Avg" value={expanded.avg_left_elbow_angle} />
                        </div>
                      </div>
                      <div>
                        <p style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.05em" }}>Right Side</p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                          <AngleStat label="Knee Avg" value={expanded.avg_right_knee_angle} />
                          <AngleStat label="Knee Min" value={expanded.min_right_knee_angle} warn={(expanded.min_right_knee_angle ?? 180) < 60} />
                          <AngleStat label="Hip Avg" value={expanded.avg_right_hip_angle} />
                          <AngleStat label="Elbow Avg" value={expanded.avg_right_elbow_angle} />
                        </div>
                      </div>
                    </div>

                    {/* XGBoost key angles */}
                    <p style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.05em" }}>Key Injury-Risk Angles</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                      <AngleStat label="Knee Valgus Avg" value={expanded.avg_knee_valgus_angle} warn={(expanded.avg_knee_valgus_angle ?? 180) < 165} />
                      <AngleStat label="Shoulder Rotation" value={expanded.avg_shoulder_rotation} warn={(expanded.avg_shoulder_rotation ?? 0) > 160} />
                    </div>

                    {/* L/R Asymmetry warning */}
                    {expanded.avg_left_knee_angle != null && expanded.avg_right_knee_angle != null && (
                      <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#475569" }}>
                        <strong>L/R Knee difference:</strong> {Math.abs(expanded.avg_left_knee_angle - expanded.avg_right_knee_angle).toFixed(1)}&deg;
                        {Math.abs(expanded.avg_left_knee_angle - expanded.avg_right_knee_angle) > 10 && (
                          <span style={{ marginLeft: "8px", color: "#dc2626", fontWeight: 700 }}>⚠ Significant asymmetry detected</span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ── PHYSIO & SCIENTIST ONLY ── Risk Flags */}
                {(viewerRole === "physiotherapist" || viewerRole === "scientist") && (
                  <div className="sg-card">
                    <p style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "14px" }}>
                      Biomechanical Risk Flags
                    </p>
                    {(expanded.frames_knee_hyperextension + expanded.frames_knee_acute_flexion + expanded.frames_excessive_trunk_lean + expanded.frames_low_symmetry + expanded.frames_elbow_hyperextension + (expanded.frames_knee_valgus ?? 0)) === 0 ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#16a34a", fontWeight: 600, fontSize: "13px" }}>
                        <span>✅</span><span>No risk flags detected in this session</span>
                      </div>
                    ) : (
                      <div>
                        <FlagRow label="Knee Hyperextension (> 175°)" frames={expanded.frames_knee_hyperextension} total={expanded.frames_with_pose ?? 1} />
                        <FlagRow label="Acute Knee Flexion (< 70°) — ACL" frames={expanded.frames_knee_acute_flexion} total={expanded.frames_with_pose ?? 1} />
                        <FlagRow label="Knee Valgus (inward collapse)" frames={expanded.frames_knee_valgus ?? 0} total={expanded.frames_with_pose ?? 1} />
                        <FlagRow label="Excessive Trunk Lean (> 25°)" frames={expanded.frames_excessive_trunk_lean} total={expanded.frames_with_pose ?? 1} />
                        <FlagRow label="Low Movement Symmetry (< 75%)" frames={expanded.frames_low_symmetry} total={expanded.frames_with_pose ?? 1} />
                        <FlagRow label="Elbow Hyperextension" frames={expanded.frames_elbow_hyperextension} total={expanded.frames_with_pose ?? 1} />
                      </div>
                    )}
                  </div>
                )}

                {/* ── SCIENTIST ONLY ── XGBoost Probability Breakdown */}
                {viewerRole === "scientist" && expanded.xgboost_probabilities && (
                  <div className="sg-card">
                    <p style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                      XGBoost Output — Probability Distribution
                    </p>
                    <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "14px" }}>Raw softmax probabilities across all 4 injury risk classes</p>
                    {(["low", "moderate", "high", "critical"] as const).map(lvl => {
                      const pct = Math.round((expanded.xgboost_probabilities![lvl] ?? 0) * 100);
                      const colors: Record<string, string> = { low: "#16a34a", moderate: "#d97706", high: "#dc2626", critical: "#7c3aed" };
                      const isWinner = expanded.risk_level === lvl;
                      return (
                        <div key={lvl} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                          <span style={{ fontSize: "12px", fontWeight: isWinner ? 800 : 500, width: "70px", color: isWinner ? colors[lvl] : "#64748b", textTransform: "capitalize" }}>
                            {isWinner ? "▶ " : ""}{lvl}
                          </span>
                          <div style={{ flex: 1, height: "10px", background: "#f1f5f9", borderRadius: "5px", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: colors[lvl], borderRadius: "5px", transition: "width 0.6s ease", opacity: isWinner ? 1 : 0.45 }} />
                          </div>
                          <span style={{ fontSize: "13px", fontWeight: 800, color: colors[lvl], width: "38px", textAlign: "right" }}>{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── SCIENTIST ONLY ── Raw Feature Matrix */}
                {viewerRole === "scientist" && <RawFeatureMatrix session={expanded} />}

                {/* ── AI CORRECTIVE PLAN — all roles ── */}
                {expanded.ai_recommendations && (
                  <div className="sg-card" style={{ borderLeft: "4px solid #7c3aed" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                      <p style={{ fontSize: "12px", fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>📋 AI Corrective Plan</p>
                      <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 500 }}>Powered by Gemini AI</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
                      <div>
                        <p style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>💪 Exercises</p>
                        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                          {expanded.ai_recommendations.exercise_recommendations.map((e, i) => (
                            <li key={i} style={{ fontSize: "12px", color: "#374151", padding: "5px 0", borderBottom: "1px solid #f1f5f9", display: "flex", gap: "6px" }}>
                              <span style={{ color: "#7c3aed", flexShrink: 0 }}>•</span>{e}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>🧘 Mobility</p>
                        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                          {expanded.ai_recommendations.mobility_suggestions.map((e, i) => (
                            <li key={i} style={{ fontSize: "12px", color: "#374151", padding: "5px 0", borderBottom: "1px solid #f1f5f9", display: "flex", gap: "6px" }}>
                              <span style={{ color: "#16a34a", flexShrink: 0 }}>•</span>{e}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>🔄 Recovery</p>
                        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                          {expanded.ai_recommendations.recovery_planning.map((e, i) => (
                            <li key={i} style={{ fontSize: "12px", color: "#374151", padding: "5px 0", borderBottom: "1px solid #f1f5f9", display: "flex", gap: "6px" }}>
                              <span style={{ color: "#d97706", flexShrink: 0 }}>•</span>{e}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Annotated Frames (all roles) */}
                {/* Annotated Frames (all roles) */}
                {expanded.annotated_frames && expanded.annotated_frames.length > 0 && (
                  <div className="sg-card">
                    <p style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "14px" }}>Annotated Frames</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px" }}>
                      {expanded.annotated_frames.map((url, i) => (
                        <img key={i} src={`${BASE_URL}${url}`} alt={`Frame ${i + 1}`} style={{ width: "100%", borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Floating Chatbot Widget — ephemeral, role-aware ── */}
      {expanded && (
        <GlobalChatbot 
          viewerRole={viewerRole} 
          athleteFirstName={athleteInfo?.first_name} 
          contextType="session" 
          sessionId={expanded.session_id} 
        />
      )}
    </div>
  );
}