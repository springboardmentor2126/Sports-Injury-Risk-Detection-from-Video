function riskBadgeClass(category) {
  if (!category) return "badge-low";
  const key = category.toLowerCase();
  if (key.includes("critical")) return "badge-critical";
  if (key.includes("high")) return "badge-high";
  if (key.includes("moderate")) return "badge-moderate";
  return "badge-low";
}

function MetricRow({ label, value, unit = "" }) {
  return (
    <tr>
      <td>{label}</td>
      <td className="font-mono">{value ?? "—"}{value != null ? unit : ""}</td>
    </tr>
  );
}

function BiomechanicsReport({ report }) {
  if (!report) return null;

  const { biomechanical_metrics, movement_quality, injury_risk, athlete } = report;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2 className="font-display" style={{ fontSize: "16px", margin: 0 }}>Biomechanics Report</h2>
            <p className="font-mono" style={{ fontSize: "12px", color: "var(--slate-500)", margin: "4px 0 0" }}>
              {report.report_id} · {report.video_filename} · {report.frames_analyzed} frames
            </p>
          </div>
          {athlete && (
            <span className="badge badge-low" style={{ background: "rgba(11,95,255,0.08)", color: "var(--blue-600)" }}>
              {athlete.name} ({athlete.athlete_id})
            </span>
          )}
        </div>
      </div>

      <div className="stat-grid">
        <div className="card">
          <p style={{ fontSize: "12px", color: "var(--slate-500)", margin: "0 0 6px" }}>Movement Quality</p>
          <div className="score-display">
            <span className="score-number">{movement_quality.score}</span>
            <span className="score-max">/ 100</span>
          </div>
          <span className="badge badge-low" style={{ marginTop: "8px", display: "inline-block" }}>
            {movement_quality.label}
          </span>
        </div>

        {injury_risk && (
          <div className="card">
            <p style={{ fontSize: "12px", color: "var(--slate-500)", margin: "0 0 6px" }}>Injury Risk Score</p>
            <div className="score-display">
              <span className="score-number">{injury_risk.score}</span>
              <span className="score-max">/ 100</span>
            </div>
            <span className={`badge ${riskBadgeClass(injury_risk.category)}`} style={{ marginTop: "8px", display: "inline-block" }}>
              {injury_risk.category}
            </span>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="font-display" style={{ fontSize: "14px", marginTop: 0, marginBottom: "14px" }}>
          Biomechanical Metrics (Averages)
        </h3>
        <table className="data-table">
          <tbody>
            <MetricRow label="Left Knee Angle" value={biomechanical_metrics.knee_angle.left_avg} unit="°" />
            <MetricRow label="Right Knee Angle" value={biomechanical_metrics.knee_angle.right_avg} unit="°" />
            <MetricRow label="Left Hip Angle" value={biomechanical_metrics.hip_angle.left_avg} unit="°" />
            <MetricRow label="Right Hip Angle" value={biomechanical_metrics.hip_angle.right_avg} unit="°" />
            <MetricRow label="Trunk Lean" value={biomechanical_metrics.trunk_lean_avg} />
            <MetricRow label="Knee Valgus Ratio" value={biomechanical_metrics.knee_valgus_ratio_avg} />
            <MetricRow label="Knee Symmetry Diff" value={biomechanical_metrics.knee_symmetry_diff_avg} unit="°" />
            <MetricRow label="Hip Symmetry Diff" value={biomechanical_metrics.hip_symmetry_diff_avg} unit="°" />
            <MetricRow label="Balance Offset" value={biomechanical_metrics.balance_offset_avg} />
          </tbody>
        </table>
      </div>

      {injury_risk && (
        <div className="card">
          <h3 className="font-display" style={{ fontSize: "14px", marginTop: 0, marginBottom: "14px" }}>
            Risk Score Breakdown
          </h3>
          <table className="data-table">
            <tbody>
              <MetricRow label="Biomechanical Deviations (35%)" value={injury_risk.breakdown.biomechanical_deviations} />
              <MetricRow label="Historical Injury Factors (20%)" value={injury_risk.breakdown.historical_injury_factors} />
              <MetricRow label="Movement Asymmetry (20%)" value={injury_risk.breakdown.movement_asymmetry} />
              <MetricRow label="Training Load Indicators (15%)" value={injury_risk.breakdown.training_load_indicators} />
              <MetricRow label="Fatigue Indicators (10%)" value={injury_risk.breakdown.fatigue_indicators} />
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default BiomechanicsReport;