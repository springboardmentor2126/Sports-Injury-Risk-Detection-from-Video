import { useEffect, useState } from "react";
import { getReportHistory, getReportById } from "../api/analysis";

function riskClass(category) {
  if (!category) return "badge-low";
  const k = category.toLowerCase();
  if (k.includes("critical")) return "badge-critical";
  if (k.includes("high")) return "badge-high";
  if (k.includes("moderate")) return "badge-moderate";
  return "badge-low";
}

function ReportHistory({ onOpenReport }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState(null);

  useEffect(() => {
    getReportHistory()
      .then(setReports)
      .catch(err => console.error("Failed to load report history:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleOpen = async (reportId) => {
    setOpeningId(reportId);
    try {
      const fullReport = await getReportById(reportId);
      onOpenReport(fullReport);
    } catch (err) {
      alert("Could not load report: " + (err.response?.data?.detail || err.message));
    } finally {
      setOpeningId(null);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <p style={{ color: "var(--slate-500)", fontSize: "14px", margin: 0 }}>
          Loading report history…
        </p>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "40px 24px" }}>
        <div style={{ fontSize: "32px", marginBottom: "12px" }}>📊</div>
        <p style={{ fontSize: "15px", fontWeight: 600, margin: "0 0 6px" }}>
          No reports available yet
        </p>
        <p style={{ fontSize: "13px", color: "var(--slate-500)", margin: 0 }}>
          Upload and analyze a video to generate your first assessment report.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="font-display" style={{ fontSize: "16px", marginTop: 0, marginBottom: "16px" }}>
        Report History
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: "12px",
          color: "var(--slate-500)", marginLeft: "10px"
        }}>
          {reports.length} {reports.length === 1 ? "report" : "reports"}
        </span>
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {reports.map(r => (
          <div key={r.report_id} style={{
            padding: "14px 16px",
            border: "1px solid var(--slate-200)",
            borderRadius: "8px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
            transition: "box-shadow 0.2s ease",
            cursor: "default"
          }}>
            <div style={{ flex: 1, minWidth: "200px" }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                <span className="font-mono" style={{ fontSize: "11px", color: "var(--slate-500)" }}>
                  {r.report_id}
                </span>
                {r.risk_category && <span className={`badge ${riskClass(r.risk_category)}`}>{r.risk_category}</span>}
              </div>
              <div style={{ fontSize: "13px", fontWeight: 500, marginBottom: "3px" }}>
                {r.video_filename}
                {r.athlete_name && (
                  <span style={{ color: "var(--slate-500)", fontWeight: 400 }}>
                    {" "}— {r.athlete_name}
                  </span>
                )}
              </div>
              <div style={{ fontSize: "12px", color: "var(--slate-500)" }}>
                {new Date(r.created_at).toLocaleString()} ·{" "}
                {r.frames_analyzed} frames
              </div>
            </div>
            <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
              {r.movement_quality_score != null && (
                <div style={{ textAlign: "center" }}>
                  <div className="font-mono" style={{ fontSize: "18px", fontWeight: 700 }}>
                    {r.movement_quality_score}
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--slate-500)" }}>QUALITY</div>
                </div>
              )}
              {r.injury_risk_score != null && (
                <div style={{ textAlign: "center" }}>
                  <div className="font-mono" style={{ fontSize: "18px", fontWeight: 700 }}>
                    {r.injury_risk_score}
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--slate-500)" }}>RISK</div>
                </div>
              )}
              <button
                className="btn btn-primary"
                style={{ padding: "7px 16px", fontSize: "13px" }}
                onClick={() => handleOpen(r.report_id)}
                disabled={openingId === r.report_id}
              >
                {openingId === r.report_id ? "Opening…" : "View →"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ReportHistory;