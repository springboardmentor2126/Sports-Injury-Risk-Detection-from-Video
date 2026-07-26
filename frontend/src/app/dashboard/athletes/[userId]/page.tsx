"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { videoApi, authApi, athleteApi, getToken, AnalysisHistoryItem } from "@/lib/api";

const RISK_CONFIG = {
  low:      { color: "#16a34a", bg: "#f0fdf4", label: "Low Risk" },
  moderate: { color: "#d97706", bg: "#fef3c7", label: "Moderate Risk" },
  high:     { color: "#dc2626", bg: "#fee2e2", label: "High Risk" },
  critical: { color: "#7c3aed", bg: "#ede9fe", label: "Critical Risk" },
};

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface AthleteInfo { first_name: string; last_name: string; email: string; sport_type: string | null; }

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
      <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "3px" }} />
      </div>
    </div>
  );
}

function AngleStat({ label, value, warn }: { label: string; value: number | null; warn?: boolean }) {
  if (value == null) return null;
  return (
    <div style={{ background: warn ? "#fef3c7" : "#f8fafc", borderRadius: "8px", padding: "10px 14px", textAlign: "center", border: `1px solid ${warn ? "#fde68a" : "#e2e8f0"}` }}>
      <p style={{ fontSize: "18px", fontWeight: 800, color: warn ? "#d97706" : "#0f172a", lineHeight: 1, marginBottom: "4px" }}>{value.toFixed(1)}&deg;</p>
      <p style={{ fontSize: "11px", color: "#94a3b8" }}>{label}</p>
    </div>
  );
}

function FlagRow({ label, frames, total }: { label: string; frames: number; total: number }) {
  if (!frames) return null;
  const pct = total > 0 ? Math.round(frames / total * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: pct > 30 ? "#dc2626" : "#d97706", flexShrink: 0, display: "inline-block" }} />
      <span style={{ flex: 1, fontSize: "13px", color: "#374151" }}>{label}</span>
      <span style={{ fontSize: "12px", fontWeight: 700, color: pct > 30 ? "#dc2626" : "#d97706" }}>{frames} frames ({pct}%)</span>
    </div>
  );
}

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

  return (
    <div>
      <Link href="/dashboard/athletes" style={{ fontSize: "13px", color: "#2563eb", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px", marginBottom: "20px" }}>
        &larr; Back to Athletes
      </Link>
      {athleteInfo && (
        <div className="sg-card" style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "18px", color: "#475569", flexShrink: 0 }}>
            {athleteInfo.first_name[0]}{athleteInfo.last_name[0]}
          </div>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", margin: 0 }}>{athleteInfo.first_name} {athleteInfo.last_name}</h1>
            <p style={{ fontSize: "13px", color: "#94a3b8", marginTop: "3px" }}>{athleteInfo.sport_type ?? "No sport"} &bull; {athleteInfo.email}</p>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#64748b" }}>{history.length} session{history.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
      )}

      {/* Injury History Section */}
      {injuries.length > 0 && (
        <div className="sg-card" style={{ marginBottom: "20px", borderLeft: "4px solid #dc2626" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>
            Past Injuries & Medical History
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {injuries.map(inj => (
              <div key={inj.id} style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: "14px", color: "#0f172a", marginBottom: "2px" }}>
                    {inj.injury_name} <span style={{ color: "#64748b", fontWeight: 400 }}>({inj.affected_body_part})</span>
                  </p>
                  <p style={{ fontSize: "13px", color: "#64748b" }}>
                    Date: {new Date(inj.injury_date).toLocaleDateString()}
                    {inj.recovery_duration_weeks ? ` • Recovery: ${inj.recovery_duration_weeks} weeks` : ""}
                  </p>
                  {inj.notes && <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>Note: {inj.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {loading ? <p style={{ color: "#94a3b8" }}>Loading sessions...</p>
        : history.length === 0 ? (
          <div className="sg-card" style={{ textAlign: "center", padding: "48px 0" }}>
            <p style={{ fontSize: "16px", color: "#64748b", fontWeight: 500 }}>No analysis sessions yet</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: "16px", alignItems: "start" }}>
            <div className="sg-card" style={{ padding: "8px" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", padding: "6px 8px", marginBottom: "4px" }}>Sessions</p>
              {history.map(h => {
                const hrc = h.risk_level ? RISK_CONFIG[h.risk_level as keyof typeof RISK_CONFIG] : null;
                const isActive = expandedSession === h.session_id;
                return (
                  <button key={h.session_id} onClick={() => setExpandedSession(h.session_id)} style={{ width: "100%", textAlign: "left", padding: "10px 10px", borderRadius: "7px", border: "none", cursor: "pointer", fontFamily: "inherit", background: isActive ? "#eff6ff" : "transparent", marginBottom: "2px" }}>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: isActive ? "#1d4ed8" : "#0f172a", marginBottom: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.filename ?? "Untitled"}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {hrc && <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "20px", background: hrc.bg, color: hrc.color }}>{hrc.label}</span>}
                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>{h.created_at ? new Date(h.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "--"}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            {expanded && (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div className="sg-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
                    <div>
                      <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>{expanded.filename ?? "Session"}</h2>
                      <p style={{ fontSize: "13px", color: "#94a3b8" }}>
                        {expanded.created_at ? new Date(expanded.created_at).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "--"}
                        &nbsp;&bull;&nbsp;{expanded.duration_seconds?.toFixed(1)}s &nbsp;&bull;&nbsp;{expanded.pose_detection_rate}% pose
                      </p>
                    </div>
                    {rc && <span style={{ fontSize: "13px", fontWeight: 700, padding: "6px 14px", borderRadius: "20px", background: rc.bg, color: rc.color }}>{rc.label}</span>}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                    <div>
                      <p style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>Movement Symmetry</p>
                      <SymBar label="Overall" value={expanded.avg_overall_symmetry} />
                      <SymBar label="Knee" value={expanded.avg_knee_symmetry} />
                      <SymBar label="Hip" value={expanded.avg_hip_symmetry} />
                    </div>
                    <div>
                      <p style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>Session Stats</p>
                      <div style={{ fontSize: "13px", color: "#374151", lineHeight: "2" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}><span>Frames analysed</span><strong>{expanded.frames_analyzed ?? "--"}</strong></div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}><span>Pose detected</span><strong>{expanded.frames_with_pose ?? "--"}</strong></div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}><span>Trunk lean avg</span><strong>{expanded.avg_trunk_lean?.toFixed(1) ?? "--"}&deg;</strong></div>
                      </div>
                    </div>
                  </div>
                </div>
                {(viewerRole === "physiotherapist" || viewerRole === "scientist") && (
                  <div className="sg-card">
                    <p style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "14px" }}>Joint Angles (Clinical ROM)</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                      <div>
                        <p style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "8px" }}>LEFT SIDE</p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                          <AngleStat label="Knee Avg" value={expanded.avg_left_knee_angle} />
                          <AngleStat label="Knee Min" value={expanded.min_left_knee_angle} warn={(expanded.min_left_knee_angle ?? 180) < 60} />
                          <AngleStat label="Hip Avg" value={expanded.avg_left_hip_angle} />
                          <AngleStat label="Elbow Avg" value={expanded.avg_left_elbow_angle} />
                        </div>
                      </div>
                      <div>
                        <p style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "8px" }}>RIGHT SIDE</p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                          <AngleStat label="Knee Avg" value={expanded.avg_right_knee_angle} />
                          <AngleStat label="Knee Min" value={expanded.min_right_knee_angle} warn={(expanded.min_right_knee_angle ?? 180) < 60} />
                          <AngleStat label="Hip Avg" value={expanded.avg_right_hip_angle} />
                          <AngleStat label="Elbow Avg" value={expanded.avg_right_elbow_angle} />
                        </div>
                      </div>
                    </div>
                    {expanded.avg_left_knee_angle != null && expanded.avg_right_knee_angle != null && (
                      <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#475569" }}>
                        <strong>L/R Knee difference:</strong> {Math.abs(expanded.avg_left_knee_angle - expanded.avg_right_knee_angle).toFixed(1)}&deg;
                        {Math.abs(expanded.avg_left_knee_angle - expanded.avg_right_knee_angle) > 10 && (
                          <span style={{ marginLeft: "8px", color: "#dc2626", fontWeight: 700 }}>Significant asymmetry detected</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {(viewerRole === "physiotherapist" || viewerRole === "scientist") && (
                  <div className="sg-card">
                    <p style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "14px" }}>Risk Flags</p>
                    {(expanded.frames_knee_hyperextension + expanded.frames_knee_acute_flexion + expanded.frames_excessive_trunk_lean + expanded.frames_low_symmetry + expanded.frames_elbow_hyperextension) === 0 ? (
                      <p style={{ fontSize: "13px", color: "#16a34a", fontWeight: 600 }}>No risk flags in this session</p>
                    ) : (
                      <div>
                        <FlagRow label="Knee Hyperextension" frames={expanded.frames_knee_hyperextension} total={expanded.frames_with_pose ?? 1} />
                        <FlagRow label="Acute Knee Flexion" frames={expanded.frames_knee_acute_flexion} total={expanded.frames_with_pose ?? 1} />
                        <FlagRow label="Excessive Trunk Lean" frames={expanded.frames_excessive_trunk_lean} total={expanded.frames_with_pose ?? 1} />
                        <FlagRow label="Low Movement Symmetry" frames={expanded.frames_low_symmetry} total={expanded.frames_with_pose ?? 1} />
                        <FlagRow label="Elbow Hyperextension" frames={expanded.frames_elbow_hyperextension} total={expanded.frames_with_pose ?? 1} />
                      </div>
                    )}
                  </div>
                )}
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
        )}
    </div>
  );
}