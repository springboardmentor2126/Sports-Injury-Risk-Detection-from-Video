"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { videoApi, authApi, AnalysisResult } from "@/lib/api";

const LS_KEY = "sg_last_analysis"; // localStorage key for persisting result

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

    try {
      const stages = [
        { at: 30, msg: "Extracting frames..." },
        { at: 55, msg: "Running pose estimation..." },
        { at: 75, msg: "Analysing biomechanics..." },
        { at: 90, msg: "Generating report..." },
      ];

      const data = await videoApi.uploadVideo(file, (pct) => {
        setProgress(pct < 25 ? pct : pct);
        const s = stages.findLast(s => pct >= s.at);
        if (s) setStage(s.msg);
      });

      setStage("Complete!");
      // Persist to localStorage so result survives navigation
      localStorage.setItem(LS_KEY, JSON.stringify(data));
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Analysis failed.");
    } finally {
      setUploading(false);
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
            marginBottom: "24px",
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
                {result.video.filename} · {result.video.duration_seconds.toFixed(1)}s · {result.video.pose_detection_rate}% pose detection
              </p>
            </div>
            <button
              id="analyze-new-btn"
              onClick={() => {
                // Delete skeleton video from server first, then reset UI
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

          {/* Risk Flags */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "20px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", marginBottom: "14px" }}>🚨 Risk Flag Summary</h2>
            <RiskBadge count={result.risk_flags.knee_acute_flexion_frames}   label="Acute Knee Flexion (< 70°) — ACL risk"         color="#dc2626" />
            <RiskBadge count={result.risk_flags.knee_hyperextension_frames}  label="Knee Hyperextension (> 175°) — ligament risk"   color="#dc2626" />
            <RiskBadge count={result.risk_flags.elbow_hyperextension_frames} label="Elbow Hyperextension — throwing injury risk"     color="#d97706" />
            <RiskBadge count={result.risk_flags.excessive_trunk_lean_frames} label="Excessive Trunk Lean (> 25°) — back injury risk" color="#d97706" />
            <RiskBadge count={result.risk_flags.low_symmetry_frames}         label="Low Movement Symmetry (< 75%) — compensation"   color="#7c3aed" />
          </div>
        </div>
      )}
    </div>
  );
}
