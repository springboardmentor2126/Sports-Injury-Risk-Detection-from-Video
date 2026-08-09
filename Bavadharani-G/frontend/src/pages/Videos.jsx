import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

const ACTIVITY_OPTIONS = ["running", "sprinting", "jumping", "squatting", "landing", "other"];

function riskBadgeClass(category) {
  if (!category) return "";
  const c = category.toLowerCase();
  if (c.includes("low")) return "low";
  if (c.includes("moderate")) return "moderate";
  if (c.includes("high")) return "high";
  if (c.includes("critical")) return "critical";
  return "";
}

function RiskBar({ label, value }) {
  const color = value >= 60 ? "var(--error)" : value >= 30 ? "var(--warning)" : "var(--success)";
  return (
    <div className="risk-bar-row">
      <div className="risk-bar-label">{label}</div>
      <div className="risk-bar-track"><div className="risk-bar-fill" style={{ width: `${value}%`, background: color }} /></div>
      <div className="risk-bar-value">{value}</div>
    </div>
  );
}

export default function Videos() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [videos, setVideos] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const [file, setFile] = useState(null);
  const [activityType, setActivityType] = useState("running");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [busyId, setBusyId] = useState(null);
  const [reports, setReports] = useState({});
  const [riskAssessments, setRiskAssessments] = useState({});
  const [itemErrors, setItemErrors] = useState({});
  const [overlayUrls, setOverlayUrls] = useState({});

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    loadVideos();
  }, [token]);

  const loadVideos = async () => {
    setLoadingList(true);
    try {
      const data = await api.listVideos(token);
      setVideos(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      await api.uploadVideo(file, activityType, token);
      setFile(null);
      e.target.reset();
      await loadVideos();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const clearItemError = (id) => setItemErrors((prev) => ({ ...prev, [id]: null }));

  const handleAnalyze = async (videoId) => {
    setBusyId(videoId);
    clearItemError(videoId);
    try {
      const report = await api.processVideo(videoId, token);
      setReports((prev) => ({ ...prev, [videoId]: report }));
      await loadVideos();
    } catch (err) {
      setItemErrors((prev) => ({ ...prev, [videoId]: err.message }));
    } finally {
      setBusyId(null);
    }
  };

  const handleRiskAssessment = async (videoId) => {
    setBusyId(videoId);
    clearItemError(videoId);
    try {
      const assessment = await api.runRiskAssessment(videoId, token);
      setRiskAssessments((prev) => ({ ...prev, [videoId]: assessment }));
    } catch (err) {
      setItemErrors((prev) => ({ ...prev, [videoId]: err.message }));
    } finally {
      setBusyId(null);
    }
  };

  const handleViewReport = async (videoId) => {
    try {
      const report = await api.getReport(videoId, token);
      setReports((prev) => ({ ...prev, [videoId]: report }));
    } catch (err) {
      setItemErrors((prev) => ({ ...prev, [videoId]: err.message }));
    }
  };

  const handleViewOverlay = async (videoId) => {
    if (overlayUrls[videoId]) return;
    const res = await fetch(api.overlayVideoUrl(videoId), { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const blob = await res.blob();
    setOverlayUrls((prev) => ({ ...prev, [videoId]: URL.createObjectURL(blob) }));
  };

  return (
    <div className="page">
      <div style={{ width: "100%", maxWidth: 780 }}>
        <form className="card wide" onSubmit={handleUpload} style={{ marginBottom: 24 }}>
          <h1>Upload video</h1>
          <p className="subtitle">Upload a short clip (mp4) for pose &amp; injury risk analysis</p>
          {uploadError && <div className="msg error">{uploadError}</div>}

          <label>Activity type</label>
          <select value={activityType} onChange={(e) => setActivityType(e.target.value)}>
            {ACTIVITY_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>

          <label>Video file (.mp4)</label>
          <input type="file" accept="video/mp4" onChange={(e) => setFile(e.target.files[0])} required />

          <button className="primary" type="submit" disabled={uploading || !file}>
            {uploading ? "Uploading..." : "Upload video"}
          </button>
        </form>

        <div className="card wide">
          <h1 style={{ fontSize: 22 }}>My videos</h1>
          {loadingList && <p className="subtitle">Loading...</p>}
          {!loadingList && videos.length === 0 && <p className="subtitle">No videos uploaded yet — upload one above to get started.</p>}

          {videos.map((v) => {
            const report = reports[v.id];
            const risk = riskAssessments[v.id];
            return (
              <div key={v.id} className="video-item">
                <div className="video-item-header">
                  <div>
                    <strong>{v.original_filename}</strong>
                    <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                      {v.activity_type || "unspecified"} · status: {v.status}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {v.status !== "completed" && (
                      <button type="button" className="primary" style={{ width: "auto", margin: 0, padding: "8px 14px" }} onClick={() => handleAnalyze(v.id)} disabled={busyId === v.id}>
                        {busyId === v.id ? "Analyzing..." : "Analyze"}
                      </button>
                    )}
                    {v.status === "completed" && (
                      <>
                        <button type="button" className="secondary" onClick={() => handleViewReport(v.id)}>View report</button>
                        <button type="button" className="secondary" onClick={() => handleViewOverlay(v.id)}>View skeleton</button>
                        <button type="button" className="primary" style={{ width: "auto", margin: 0, padding: "8px 14px" }} onClick={() => handleRiskAssessment(v.id)} disabled={busyId === v.id}>
                          {busyId === v.id ? "Assessing..." : "Assess injury risk"}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {itemErrors[v.id] && <div className="msg error" style={{ marginTop: 12 }}>{itemErrors[v.id]}</div>}

                {report && (
                  <div style={{ marginTop: 14, fontSize: 14, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                    <div className="stat-grid">
                      <div className="stat-box"><div className="stat-label">Movement quality</div><div className="stat-value">{report.movement_quality_score ?? "—"}</div></div>
                      <div className="stat-box"><div className="stat-label">Detection rate</div><div className="stat-value">{(report.detection_rate * 100).toFixed(0)}%</div></div>
                      <div className="stat-box"><div className="stat-label">Knee asymmetry</div><div className="stat-value">{report.knee_angle_asymmetry ?? "—"}°</div></div>
                      <div className="stat-box"><div className="stat-label">Trunk lean</div><div className="stat-value">{report.avg_trunk_lean_angle ?? "—"}°</div></div>
                    </div>
                    {report.notes && JSON.parse(report.notes).length > 0 && (
                      <ul style={{ color: "var(--text-dim)", fontSize: 13, paddingLeft: 18 }}>
                        {JSON.parse(report.notes).map((note, i) => <li key={i}>{note}</li>)}
                      </ul>
                    )}
                  </div>
                )}

                {overlayUrls[v.id] && <video src={overlayUrls[v.id]} controls style={{ width: "100%", marginTop: 14, borderRadius: 6 }} />}

                {risk && (
                  <div style={{ marginTop: 14, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                      <span className={`badge ${riskBadgeClass(risk.risk_category)}`}>{risk.risk_category}</span>
                      <span style={{ fontSize: 13, color: "var(--text-dim)" }}>Overall risk score: {risk.overall_risk_score}/100</span>
                    </div>

                    <RiskBar label="ACL" value={risk.acl_risk} />
                    <RiskBar label="Hamstring" value={risk.hamstring_risk} />
                    <RiskBar label="Ankle sprain" value={risk.ankle_sprain_risk} />
                    <RiskBar label="Lower back" value={risk.lower_back_risk} />
                    <RiskBar label="Overuse" value={risk.overuse_risk} />

                    {risk.top_risk_factors && (
                      <div style={{ marginTop: 14 }}>
                        <div style={{ fontSize: 12, textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 6 }}>Risk factors</div>
                        <ul style={{ fontSize: 13, paddingLeft: 18, margin: 0 }}>
                          {JSON.parse(risk.top_risk_factors).map((f, i) => <li key={i} style={{ marginBottom: 4 }}>{f}</li>)}
                        </ul>
                      </div>
                    )}

                    {risk.recommendations && (
                      <div style={{ marginTop: 14 }}>
                        <div style={{ fontSize: 12, textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 6 }}>Recommendations</div>
                        <ul style={{ fontSize: 13, paddingLeft: 18, margin: 0 }}>
                          {JSON.parse(risk.recommendations).map((r, i) => <li key={i} style={{ marginBottom: 4 }}>{r}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
