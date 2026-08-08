import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/api";
import "../styles/upload.css";
 
function useQuery() {
  return new URLSearchParams(useLocation().search);
}
 
const RISK_COLORS = {
  Low: "#22C55E",
  Moderate: "#F59E0B",
  High: "#EF4444",
  Critical: "#991B1B",
};
 
function riskColor(level) {
  return RISK_COLORS[level] || "#334155";
}
 
function displayInjuryName(name) {
  return name === "LowerBack" ? "Lower Back" : name;
}
 
const PROCESSING_STAGES = [
  "Uploading and preparing video...",
  "Running pose estimation (MediaPipe)...",
  "Tracking skeleton across every frame...",
  "Calculating joint angles and range of motion...",
  "Evaluating movement symmetry and stability...",
  "Predicting injury risk...",
  "Compiling PDF biomechanics report...",
];
 
function formatElapsed(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
 
const sectionStyle = { margin: "32px 0" };
const cardStyle = {
  background: "#F8FAFC",
  border: "1px solid #E2E8F0",
  borderRadius: "10px",
  padding: "20px",
};
const tableWrapStyle = { overflowX: "auto" };
const thStyle = {
  textAlign: "left",
  padding: "10px 12px",
  background: "#1E3A8A",
  color: "#fff",
  fontSize: "13px",
};
const tdStyle = {
  padding: "10px 12px",
  borderBottom: "1px solid #E2E8F0",
  fontSize: "14px",
  verticalAlign: "top",
};
 
function Results() {
  const query = useQuery();
  const navigate = useNavigate();
  const analysisId = query.get("analysis_id");
 
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [videoError, setVideoError] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
 
  useEffect(() => {
    if (!analysisId) {
      setError("No analysis_id provided in URL.");
      setLoading(false);
      return;
    }
 
    let cancelled = false;
    let pollTimer = null;
 
    const fetchAnalysis = async (isFirstLoad) => {
      try {
        if (isFirstLoad) setLoading(true);
        const res = await api.get(`/analysis/${encodeURIComponent(analysisId)}`);
        if (cancelled) return;
 
        setAnalysis(res.data);
        setError(null);
 
        // Still being processed on the server - check again in a few
        // seconds. This is what lets the user navigate away and come back:
        // this page just keeps asking "is it done yet?" independently of
        // whatever else the user does in the meantime.
        if (res.data.status === "processing") {
          pollTimer = setTimeout(() => fetchAnalysis(false), 3000);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.detail || "Failed to load analysis results.");
      } finally {
        if (!cancelled && isFirstLoad) setLoading(false);
      }
    };
 
    fetchAnalysis(true);
 
    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [analysisId]);
 
  // Ticks once per second while processing, purely to show elapsed time and
  // cycle through staged progress text - genuinely reassuring on a
  // long-running task, and honest (it's not claiming false precision about
  // what stage the pipeline is actually in server-side).
  useEffect(() => {
    if (!analysis || analysis.status !== "processing") return;
    const timer = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [analysis?.status]);
 
  if (loading) {
    return (
      <div className="page">
        <div className="container" style={{ padding: "60px 20px", textAlign: "center" }}>
          <p>Loading analysis results...</p>
        </div>
      </div>
    );
  }
 
  if (error) {
    return (
      <div className="page">
        <div className="container" style={{ padding: "60px 20px", textAlign: "center" }}>
          <h3>Couldn't load results</h3>
          <p style={{ color: "#DC2626" }}>{error}</p>
        </div>
      </div>
    );
  }
 
  if (analysis && analysis.status === "processing") {
    const stageIndex = Math.min(Math.floor(elapsedSeconds / 4), PROCESSING_STAGES.length - 1);
    const progressPct = Math.min(95, Math.round((elapsedSeconds / 60) * 100));
 
    return (
      <div className="page">
        <style>{`
          @keyframes results-spin { to { transform: rotate(360deg); } }
        `}</style>
        <div className="container" style={{ padding: "60px 20px", textAlign: "center", maxWidth: "520px", margin: "0 auto" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              margin: "0 auto 24px",
              borderRadius: "50%",
              border: "4px solid #E2E8F0",
              borderTopColor: "#2563EB",
              animation: "results-spin 0.9s linear infinite",
            }}
          />
 
          <h2 style={{ marginBottom: "6px" }}>Analyzing Your Video</h2>
          <p style={{ color: "#334155", fontWeight: 600, minHeight: "24px" }}>
            {PROCESSING_STAGES[stageIndex]}
          </p>
 
          <div
            style={{
              width: "100%",
              height: "8px",
              background: "#E2E8F0",
              borderRadius: "999px",
              overflow: "hidden",
              margin: "16px 0 8px",
            }}
          >
            <div
              style={{
                width: `${progressPct}%`,
                height: "100%",
                background: "#2563EB",
                borderRadius: "999px",
                transition: "width 1s linear",
              }}
            />
          </div>
          <p style={{ color: "#94A3B8", fontSize: "13px" }}>
            Elapsed: {formatElapsed(elapsedSeconds)} — longer videos can take a minute or more.
          </p>
 
          <div
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "10px",
              padding: "16px 20px",
              marginTop: "24px",
              fontSize: "13px",
              color: "#64748B",
              textAlign: "left",
            }}
          >
            This is running as a background job on the server, fully independent of
            this browser tab. You're free to leave this page — nothing will be lost or
            interrupted, and you can check on it anytime from your Dashboard.
          </div>
 
          <button
            className="btn"
            style={{ marginTop: "20px" }}
            onClick={() => navigate("/dashboard")}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }
 
  if (analysis && analysis.status === "failed") {
    return (
      <div className="page">
        <div className="container" style={{ padding: "60px 20px", textAlign: "center", maxWidth: "600px", margin: "0 auto" }}>
          <h3>Analysis failed</h3>
          <p style={{ color: "#DC2626" }}>
            {analysis.error_message || "Something went wrong while processing this video."}
          </p>
        </div>
      </div>
    );
  }
 
  const {
    biomechanics,
    movement_quality,
    injury_risks,
    risk_score_summary,
    recommendations,
    movement_anomalies,
    processed_video_download,
    report_download,
    filename,
    athlete_name,
  } = analysis;
 
  const rom = biomechanics?.range_of_motion || {};
  const breakdown = risk_score_summary?.breakdown || {};
 
  return (
    <div className="page">
      <div className="container" style={{ padding: "40px 20px", maxWidth: "900px", margin: "0 auto" }}>
        <h2>Analysis Results</h2>
        <p style={{ color: "#64748B" }}>
          {athlete_name ? `Athlete: ${athlete_name}` : null} {filename ? `— ${filename}` : null}
        </p>
 
        {/* ---------------- Processed Video ---------------- */}
        <div style={sectionStyle}>
          <h3>Processed Video</h3>
          {videoError ? (
            <div style={{ color: "#DC2626" }}>
              The processed video couldn't be played. This usually means either:
              <ul>
                <li>the video is still processing / failed on the server (check the backend logs), or</li>
                <li>the file exists but isn't a browser-compatible format (ffmpeg/H.264 conversion issue).</li>
              </ul>
              You can still try downloading it directly:{" "}
              <a href={processed_video_download} target="_blank" rel="noreferrer">
                {processed_video_download}
              </a>
            </div>
          ) : (
            <div
              style={{
                width: "100%",
                maxWidth: "640px",
                aspectRatio: "16 / 9",
                margin: "0 auto",
                background: "#000",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              <video
                key={processed_video_download}
                controls
                preload="auto"
                style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                onError={() => setVideoError(true)}
              >
                <source src={processed_video_download} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          )}
        </div>
 
        <div style={sectionStyle}>
          <a href={report_download} target="_blank" rel="noreferrer" className="btn">
            Download PDF Biomechanics Report
          </a>
        </div>
 
        {/* ---------------- Injury Risk Evaluation ---------------- */}
        {risk_score_summary && (
          <div style={sectionStyle}>
            <h3>Injury Risk Evaluation</h3>
            <div style={{ ...cardStyle, display: "flex", gap: "32px", flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ textAlign: "center", minWidth: "140px" }}>
                <div style={{ fontSize: "40px", fontWeight: 800, color: riskColor(risk_score_summary.risk_level) }}>
                  {risk_score_summary.overall_score}%
                </div>
                <div style={{ fontWeight: 700, color: "#334155" }}>
                  OVERALL RISK: {risk_score_summary.risk_level?.toUpperCase()}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: "240px" }}>
                <strong>Weighted Risk Score Factors:</strong>
                <ul style={{ margin: "8px 0 0", paddingLeft: "20px", lineHeight: 1.7 }}>
                  <li>Biomechanical Deviations (35%): {breakdown.biomechanical_deviations ?? 0}%</li>
                  <li>Movement Asymmetry (20%): {breakdown.movement_asymmetry ?? 0}%</li>
                  <li>Historical Injury Factors (20%): {breakdown.historical_factors ?? 0}%</li>
                  <li>Training Load Indicators (15%): {breakdown.training_load ?? 0}%</li>
                  <li>Fatigue Indicators (10%): {breakdown.fatigue ?? 0}%</li>
                </ul>
              </div>
            </div>
          </div>
        )}
 
        {/* ---------------- Predicted Injury Profile ---------------- */}
        {injury_risks && (
          <div style={sectionStyle}>
            <h3>Predicted Injury Profile</h3>
            <div style={tableWrapStyle}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Injury Category</th>
                    <th style={thStyle}>Risk Level</th>
                    <th style={thStyle}>Probability</th>
                    <th style={thStyle}>Primary Contributing Factors</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(injury_risks).map(([name, data]) => (
                    <tr key={name}>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{displayInjuryName(name)}</td>
                      <td style={{ ...tdStyle, color: riskColor(data.risk_level), fontWeight: 700 }}>
                        {data.risk_level}
                      </td>
                      <td style={tdStyle}>{data.probability}%</td>
                      <td style={tdStyle}>
                        <ul style={{ margin: 0, paddingLeft: "18px" }}>
                          {(data.reasons || []).map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
 
        {/* ---------------- Movement Anomaly Detection ---------------- */}
        {movement_anomalies && (
          <div style={sectionStyle}>
            <h3>Movement Anomaly Detection</h3>
            <p style={{ color: "#64748B", fontSize: "13px", marginTop: "-4px" }}>
              Compares this session against this athlete's own recent history - not just fixed thresholds.
            </p>
 
            {movement_anomalies.status === "insufficient_history" ? (
              <div style={{ ...cardStyle, color: "#64748B" }}>
                {movement_anomalies.message}
              </div>
            ) : (
              <>
                <div
                  style={{
                    ...cardStyle,
                    fontWeight: 700,
                    color: movement_anomalies.anomalies.length > 0 ? "#EF4444" : "#22C55E",
                    marginBottom: movement_anomalies.anomalies.length > 0 ? "12px" : "0",
                  }}
                >
                  {movement_anomalies.overall_flag}
                  <span style={{ fontWeight: 400, color: "#64748B", marginLeft: "10px" }}>
                    (compared against last {movement_anomalies.sessions_compared} session
                    {movement_anomalies.sessions_compared === 1 ? "" : "s"})
                  </span>
                </div>
 
                {movement_anomalies.anomalies.length > 0 && (
                  <div style={tableWrapStyle}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={thStyle}>Metric</th>
                          <th style={thStyle}>Baseline</th>
                          <th style={thStyle}>Current</th>
                          <th style={thStyle}>Change</th>
                          <th style={thStyle}>Severity</th>
                          <th style={thStyle}>Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {movement_anomalies.anomalies.map((a, i) => (
                          <tr key={i}>
                            <td style={{ ...tdStyle, fontWeight: 700 }}>{a.metric}</td>
                            <td style={tdStyle}>{a.baseline}</td>
                            <td style={tdStyle}>{a.current}</td>
                            <td style={tdStyle}>{a.change_pct > 0 ? "+" : ""}{a.change_pct}%</td>
                            <td style={{ ...tdStyle, color: riskColor(a.severity), fontWeight: 700 }}>
                              {a.severity}
                            </td>
                            <td style={tdStyle}>{a.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}
 
        {/* ---------------- Movement Quality ---------------- */}
        {movement_quality && (
          <div style={sectionStyle}>
            <h3>Movement Quality</h3>
            <div style={{ ...cardStyle, display: "flex", gap: "24px", flexWrap: "wrap" }}>
              <div><strong>Score:</strong> {movement_quality.movement_score}/100</div>
              <div><strong>Grade:</strong> {movement_quality.grade}</div>
              <div><strong>Stability:</strong> {movement_quality.stability_score}%</div>
              <div><strong>Balance:</strong> {movement_quality.balance_score}%</div>
            </div>
            {movement_quality.feedback && movement_quality.feedback.length > 0 && (
              <ul style={{ marginTop: "12px" }}>
                {movement_quality.feedback.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            )}
          </div>
        )}
 
        {/* ---------------- Biomechanical Joint Performance ---------------- */}
        {Object.keys(rom).length > 0 && (
          <div style={sectionStyle}>
            <h3>Biomechanical Joint Performance</h3>
            <div style={tableWrapStyle}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, background: "#475569" }}>Joint / Muscle</th>
                    <th style={{ ...thStyle, background: "#475569" }}>Average Angle</th>
                    <th style={{ ...thStyle, background: "#475569" }}>Min / Max Reached</th>
                    <th style={{ ...thStyle, background: "#475569" }}>Range of Motion</th>
                    <th style={{ ...thStyle, background: "#475569" }}>ROM Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(rom).map(([joint, stats]) => (
                    <tr key={joint}>
                      <td style={tdStyle}>{joint.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</td>
                      <td style={tdStyle}>{stats.avg}°</td>
                      <td style={tdStyle}>{stats.min}° - {stats.max}°</td>
                      <td style={tdStyle}>{stats.rom}°</td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: stats.status === "Normal" ? "#22C55E" : "#EF4444" }}>
                        {stats.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
 
        {/* ---------------- Corrective Recommendations ---------------- */}
        {recommendations && recommendations.length > 0 && (
          <div style={sectionStyle}>
            <h3>Corrective Recommendations</h3>
            {recommendations.map((rec, i) => (
              <div key={i} style={{ ...cardStyle, marginBottom: "12px" }}>
                <div style={{ fontWeight: 700, marginBottom: "8px" }}>
                  {rec.category} <span style={{ fontWeight: 400, color: "#64748B" }}>(Freq: {rec.frequency})</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: "20px" }}>
                  {rec.exercises.map((ex, j) => (
                    <li key={j} style={{ marginBottom: "4px" }}>{ex}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
 
export default Results;