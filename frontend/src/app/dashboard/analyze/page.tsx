"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { videoApi, authApi, AnalysisResult } from "@/lib/api";

const LS_KEY = "sg_last_analysis";           // localStorage key for persisting result
const LS_ANALYZING_KEY = "sg_analysis_in_progress"; // key for the global banner

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const RISK_CONFIG = {
  low:      { color: "#16a34a", bg: "#dcfce7", border: "#bbf7d0", label: "Low Risk",      icon: "✓" },
  moderate: { color: "#d97706", bg: "#fef3c7", border: "#fde68a", label: "Moderate Risk", icon: "⚠" },
  high:     { color: "#dc2626", bg: "#fee2e2", border: "#fecaca", label: "High Risk",      icon: "⚠" },
  critical: { color: "#7c3aed", bg: "#ede9fe", border: "#ddd6fe", label: "Critical Risk",  icon: "✕" },
};

function fmt(val: number | null, unit = "°") {
  return val != null ? `${val.toFixed(1)}${unit}` : "—";
}

function MetricCard({ label, value, unit = "°", risk = false }: { label: string; value: number | null; unit?: string; risk?: boolean }) {
  return (
    <div style={{
      background: value == null ? "#f8fafc" : risk ? "#fff7f7" : "#f0fdf4",
      border: `1px solid ${value == null ? "#e2e8f0" : risk ? "#fecaca" : "#bbf7d0"}`,
      borderRadius: "10px",
      padding: "14px 16px",
    }}>
      <div style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
        {label}
      </div>
      <div style={{ fontSize: "22px", fontWeight: 700, color: value == null ? "#cbd5e1" : risk ? "#dc2626" : "#16a34a" }}>
        {fmt(value, unit)}
      </div>
    </div>
  );
}

function SymmetryBar({ label, value }: { label: string; value: number | null }) {
  const pct = value != null ? Math.round(value * 100) : null;
  const color = pct == null ? "#e2e8f0" : pct >= 90 ? "#16a34a" : pct >= 75 ? "#d97706" : "#dc2626";
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
        <span style={{ fontSize: "13px", color: "#475569", fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: "13px", fontWeight: 700, color }}>{pct != null ? `${pct}%` : "—"}</span>
      </div>
      <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct ?? 0}%`, background: color, borderRadius: "3px", transition: "width 1s ease" }} />
      </div>
    </div>
  );
}

function RiskBadge({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "10px 14px", borderRadius: "8px",
      background: count > 0 ? `${color}15` : "#f8fafc",
      border: `1px solid ${count > 0 ? `${color}40` : "#e2e8f0"}`,
      marginBottom: "8px",
    }}>
      <span style={{ fontSize: "13px", color: "#475569", fontWeight: 500 }}>{label}</span>
      <span style={{
        fontSize: "12px", fontWeight: 700, padding: "2px 10px", borderRadius: "20px",
        background: count > 0 ? color : "#94a3b8", color: "#fff",
      }}>{count} frames</span>
    </div>
  );
}

export default function AnalyzePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Redirect non-athletes away from this page
  useEffect(() => {
    authApi.getMe().then(u => {
      const role = u.role?.name ?? "athlete";
      if (role !== "athlete") router.replace("/dashboard/athletes");
    }).catch(() => {});
  }, [router]);

  // Restore last result from localStorage when user navigates back
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) setResult(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // Poll for AI recommendations if they are missing
  useEffect(() => {
    if (result && !result.ai_recommendations) {
      const interval = setInterval(async () => {
        try {
          const history = await videoApi.getHistory();
          const currentSession = history.find(h => h.session_id === result.session_id);
          if (currentSession && currentSession.ai_recommendations) {
            // Recommendation is ready! Update state and localStorage.
            const updatedResult = { ...result, ai_recommendations: currentSession.ai_recommendations };
            setResult(updatedResult);
            localStorage.setItem(LS_KEY, JSON.stringify(updatedResult));
          }
        } catch (e) {
          console.error("Failed to poll history", e);
        }
      }, 3000); // Check every 3 seconds

      return () => clearInterval(interval);
    }
  }, [result]);


  const handleFile = (f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase() || "";
    if (!["mp4", "mov", "avi", "mkv", "webm"].includes(ext)) {
      setError("Unsupported file type. Please upload MP4, MOV, AVI, MKV, or WEBM.");
      return;
    }
    setFile(f);
    setError(null);
    setResult(null);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const runAnalysis = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setError(null);
    setStage("Uploading video...");
    // Set the global banner — survives navigation
    try { localStorage.setItem(LS_ANALYZING_KEY, JSON.stringify({ filename: file.name })); } catch {}

    try {
      const stages = [
        { at: 30, msg: "Extracting frames..." },
        { at: 55, msg: "Running pose estimation..." },
        { at: 75, msg: "Analysing biomechanics..." },
        { at: 90, msg: "Calculating injury risk..." },
      ];

      const data = await videoApi.uploadVideo(file, (pct) => {
        setProgress(pct < 25 ? pct : pct);
        const s = stages.findLast(s => pct >= s.at);
        if (s) setStage(s.msg);
      });

      setStage("Complete! ✨");
      // Persist to localStorage so result survives navigation
      localStorage.setItem(LS_KEY, JSON.stringify(data));
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Analysis failed.");
    } finally {
      setUploading(false);
      // Clear the global banner regardless of success or failure
      try { localStorage.removeItem(LS_ANALYZING_KEY); } catch {}
    }
  };

  const risk = result ? RISK_CONFIG[result.risk_level] ?? RISK_CONFIG.low : null;

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto" }}>

      {/* ── Page Header ── */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0f172a", margin: 0 }}>Video Analysis</h1>
        <p style={{ fontSize: "14px", color: "#64748b", marginTop: "4px" }}>
          Upload an athlete video to run AI-powered pose estimation and biomechanical analysis.
        </p>
      </div>

      {/* ── Upload Zone ── */}
      {!result && (
        <div style={{
          border: `2px dashed ${dragging ? "#2563eb" : file ? "#16a34a" : "#cbd5e1"}`,
          borderRadius: "16px",
          background: dragging ? "#eff6ff" : file ? "#f0fdf4" : "#fafafa",
          padding: "48px 32px",
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.2s",
          marginBottom: "24px",
        }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" accept="video/*" style={{ display: "none" }}
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

          {file ? (
            <>
              <div style={{ fontSize: "36px", marginBottom: "10px" }}>🎬</div>
              <p style={{ fontSize: "15px", fontWeight: 600, color: "#16a34a" }}>{file.name}</p>
              <p style={{ fontSize: "13px", color: "#64748b" }}>{(file.size / 1024 / 1024).toFixed(1)} MB — Click to change</p>
            </>
          ) : (
            <>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>📹</div>
              <p style={{ fontSize: "16px", fontWeight: 600, color: "#1e293b" }}>Drop your video here</p>
              <p style={{ fontSize: "13px", color: "#94a3b8", marginTop: "4px" }}>or click to browse · MP4, MOV, AVI, MKV, WEBM</p>
            </>
          )}
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div style={{ background: "#fee2e2", border: "1px solid #fecaca", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", color: "#dc2626", fontSize: "14px" }}>
          ⚠ {error}
        </div>
      )}

      {/* ── Upload button / progress ── */}
      {file && !result && (
        <div style={{ marginBottom: "28px" }}>
          {uploading ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "13px", color: "#475569", fontWeight: 500 }}>{stage}</span>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#2563eb" }}>{progress}%</span>
              </div>
              <div style={{ height: "8px", background: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #2563eb, #7c3aed)", borderRadius: "4px", transition: "width 0.3s ease" }} />
              </div>
              <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "8px" }}>This may take 30–60 seconds for a typical sports video…</p>
            </div>
          ) : (
            <button id="run-analysis-btn" onClick={runAnalysis} style={{
              width: "100%", padding: "14px", borderRadius: "10px",
              background: "linear-gradient(135deg, #2563eb, #7c3aed)",
              color: "#fff", fontSize: "15px", fontWeight: 600,
              border: "none", cursor: "pointer", fontFamily: "inherit",
              boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
              transition: "opacity 0.15s",
            }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              🔬 Run Biomechanical Analysis
            </button>
          )}
        </div>
      )}

      {/* ── RESULTS ── */}
      {result && risk && (
        <div>
          {/* Risk Banner */}
          <div style={{
            display: "flex", alignItems: "center", gap: "16px",
            padding: "20px 24px", borderRadius: "14px",
            background: risk.bg, border: `2px solid ${risk.border}`,
            marginBottom: "16px",
          }}>
            <div style={{
              width: "48px", height: "48px", borderRadius: "50%",
              background: risk.color, color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "22px", fontWeight: 700, flexShrink: 0,
            }}>{risk.icon}</div>
            <div>
              <p style={{ fontWeight: 700, fontSize: "18px", color: risk.color, margin: 0 }}>{risk.label}</p>
              <p style={{ fontSize: "13px", color: "#64748b", margin: "2px 0 0" }}>
                {result.video.filename} &middot; {result.video.duration_seconds.toFixed(1)}s &middot; {result.video.pose_detection_rate}% pose detection
              </p>
            </div>
            <button
              id="analyze-new-btn"
              onClick={() => {
                if (result.session_id) videoApi.deleteSkeletonVideo(result.session_id);
                localStorage.removeItem(LS_KEY);
                setResult(null);
                setFile(null);
              }}
              style={{
                marginLeft: "auto", padding: "8px 16px", borderRadius: "8px",
                background: "transparent", border: `1px solid ${risk.border}`,
                color: risk.color, fontWeight: 600, fontSize: "13px",
                cursor: "pointer", fontFamily: "inherit",
              }}
            >+ New Video</button>
          </div>

          {/* XGBoost AI Verdict Panel */}
          {result.xgboost && (
            <div style={{
              background: "#f8fafc", border: "1px solid #e2e8f0",
              borderRadius: "14px", padding: "16px 20px", marginBottom: "24px",
              display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "18px" }}>🤖</span>
                <div>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>AI Confidence</p>
                  <p style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                    {(result.xgboost.confidence * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: "200px" }}>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>Risk Probability Breakdown</p>
                {(["low", "moderate", "high", "critical"] as const).map(lvl => {
                  const pct = Math.round((result.xgboost.probabilities[lvl] ?? 0) * 100);
                  const colors: Record<string, string> = { low: "#16a34a", moderate: "#d97706", high: "#dc2626", critical: "#7c3aed" };
                  return (
                    <div key={lvl} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span style={{ fontSize: "11px", width: "60px", color: "#64748b", textTransform: "capitalize" }}>{lvl}</span>
                      <div style={{ flex: 1, height: "6px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: colors[lvl], borderRadius: "3px", transition: "width 0.8s ease" }} />
                      </div>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: colors[lvl], width: "34px", textAlign: "right" }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: "12px", color: "#94a3b8", borderLeft: "1px solid #e2e8f0", paddingLeft: "16px" }}>
                Sport profile used:<br />
                <strong style={{ color: "#475569" }}>{result.xgboost.sport_used.replace("_", " ")}</strong>
              </div>
            </div>
          )}

          {/* ── Skeleton Video Player ── */}
          {result.annotated_video_url && (
            <div style={{
              background: "#0f172a", borderRadius: "14px",
              overflow: "hidden", marginBottom: "24px",
              border: "1px solid #1e293b",
            }}>
              <div style={{
                padding: "14px 18px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "#f1f5f9" }}>🎬 Skeleton Tracking Video</span>
                  <span style={{
                    marginLeft: "10px", fontSize: "11px", fontWeight: 600,
                    background: "#dc2626", color: "#fff", padding: "2px 8px",
                    borderRadius: "20px",
                  }}>LIVE</span>
                </div>
                <span style={{ fontSize: "11px", color: "#64748b" }}>
                  ⚠ Temporary — deleted when you start a new analysis
                </span>
              </div>
              <video
                src={`${BASE_URL}${result.annotated_video_url}`}
                controls
                autoPlay
                style={{ width: "100%", display: "block", maxHeight: "480px", background: "#000" }}
              />
            </div>
          )}

          {/* Annotated Frame Screenshots */}
          {result.annotated_frames.length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>
                📸 Annotated Frames
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px" }}>
                {result.annotated_frames.map((url, i) => (
                  <img key={i} src={`${BASE_URL}${url}`} alt={`Frame ${i + 1}`}
                    style={{ width: "100%", borderRadius: "10px", border: "1px solid #e2e8f0", objectFit: "cover" }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Biomechanics Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>

            {/* Joint Angles */}
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "20px" }}>
              <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", marginBottom: "16px" }}>🦵 Joint Angles</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <MetricCard label="L-Knee Avg"  value={result.biomechanics.avg_left_knee_angle} />
                <MetricCard label="R-Knee Avg"  value={result.biomechanics.avg_right_knee_angle} />
                <MetricCard label="L-Knee Min"  value={result.biomechanics.min_left_knee_angle}
                  risk={(result.biomechanics.min_left_knee_angle ?? 999) < 70} />
                <MetricCard label="R-Knee Min"  value={result.biomechanics.min_right_knee_angle}
                  risk={(result.biomechanics.min_right_knee_angle ?? 999) < 70} />
                <MetricCard label="L-Hip Avg"   value={result.biomechanics.avg_left_hip_angle} />
                <MetricCard label="R-Hip Avg"   value={result.biomechanics.avg_right_hip_angle} />
                <MetricCard label="L-Elbow Avg" value={result.biomechanics.avg_left_elbow_angle} />
                <MetricCard label="R-Elbow Avg" value={result.biomechanics.avg_right_elbow_angle} />
              </div>
            </div>

            {/* Symmetry + Trunk */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "20px", flex: 1 }}>
                <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", marginBottom: "16px" }}>⚖ Movement Symmetry</h2>
                <SymmetryBar label="Overall"       value={result.biomechanics.avg_overall_symmetry} />
                <SymmetryBar label="Knee Symmetry" value={result.biomechanics.avg_knee_symmetry} />
                <SymmetryBar label="Hip Symmetry"  value={result.biomechanics.avg_hip_symmetry} />
              </div>

              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "20px" }}>
                <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>🏋 Trunk Lean</h2>
                <div style={{ fontSize: "32px", fontWeight: 700, color: (result.biomechanics.avg_trunk_lean ?? 0) > 25 ? "#dc2626" : "#0f172a" }}>
                  {fmt(result.biomechanics.avg_trunk_lean)}
                </div>
                <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                  {(result.biomechanics.avg_trunk_lean ?? 0) > 25 ? "⚠ Excessive — lower back stress risk" : "Within normal range"}
                </p>
              </div>
            </div>
          </div>

          {/* ── AI CORRECTIVE PLAN — shown to athlete after upload ── */}
          {result.ai_recommendations ? (
            <div style={{ background: "#fff", borderTop: "1px solid #e2e8f0", borderRight: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", borderRadius: "14px", padding: "20px", borderLeft: "4px solid #7c3aed" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#7c3aed", margin: 0 }}>📋 AI Corrective Plan</h2>
                <span style={{ fontSize: "10px", color: "#94a3b8" }}>Powered by Gemini AI</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
                <div>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>💪 Exercises</p>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {result.ai_recommendations.exercise_recommendations.map((e: string, i: number) => (
                      <li key={i} style={{ fontSize: "12px", color: "#374151", padding: "5px 0", borderBottom: "1px solid #f1f5f9", display: "flex", gap: "6px" }}>
                        <span style={{ color: "#7c3aed", flexShrink: 0 }}>•</span>{e}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>🧘 Mobility</p>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {result.ai_recommendations.mobility_suggestions.map((e: string, i: number) => (
                      <li key={i} style={{ fontSize: "12px", color: "#374151", padding: "5px 0", borderBottom: "1px solid #f1f5f9", display: "flex", gap: "6px" }}>
                        <span style={{ color: "#16a34a", flexShrink: 0 }}>•</span>{e}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>🔄 Recovery</p>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {result.ai_recommendations.recovery_planning.map((e: string, i: number) => (
                      <li key={i} style={{ fontSize: "12px", color: "#374151", padding: "5px 0", borderBottom: "1px solid #f1f5f9", display: "flex", gap: "6px" }}>
                        <span style={{ color: "#d97706", flexShrink: 0 }}>•</span>{e}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            /* AI plan is being generated in background — show subtle placeholder */
            <div style={{ background: "#faf5ff", borderTop: "1px solid #ddd6fe", borderRight: "1px solid #ddd6fe", borderBottom: "1px solid #ddd6fe", borderRadius: "14px", padding: "18px 20px", borderLeft: "4px solid #7c3aed", display: "flex", alignItems: "center", gap: "12px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              <div>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "#7c3aed", margin: 0 }}>📋 AI Corrective Plan — Generating...</p>
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: "3px 0 0" }}>Gemini AI is building your personalised plan. View it by reopening this session from your history.</p>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

