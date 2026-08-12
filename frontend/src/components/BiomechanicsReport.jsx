import { useState, useEffect } from "react";
import { getProgressComparison } from "../api/analysis";

function Badge({ text, type }) {
  const classMap = {
    low: "badge-low",
    moderate: "badge-moderate",
    high: "badge-high",
    critical: "badge-critical",
    excellent: "badge-low",
    good: "badge-low",
    fair: "badge-moderate",
    poor: "badge-high",
  };
  const key = (text || "").toLowerCase().replace(" risk", "");
  return <span className={`badge ${classMap[key] || "badge-low"}`}>{text}</span>;
}

function SectionCard({ title, children }) {
  return (
    <div className="card" style={{ marginBottom: "16px" }}>
      <h3 className="font-display" style={{
        fontSize: "14px", margin: "0 0 14px",
        paddingBottom: "10px", borderBottom: "1px solid var(--slate-200)"
      }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function MetricRow({ label, value, unit = "" }) {
  return (
    <tr>
      <td style={{ padding: "9px 8px", color: "var(--slate-500)", fontSize: "13px", width: "55%" }}>
        {label}
      </td>
      <td className="font-mono" style={{ padding: "9px 8px", fontSize: "13px" }}>
        {value != null ? `${value}${unit}` : "—"}
      </td>
    </tr>
  );
}

function ProgressCard({ reportId }) {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!reportId) return;
    getProgressComparison(reportId)
      .then(setProgress)
      .catch(() => setProgress(null))
      .finally(() => setLoading(false));
  }, [reportId]);

  if (loading || !progress || !progress.has_previous) return null;

  const { previous, progress: p } = progress;
  const qColor = p.movement_quality_change > 0
    ? "var(--risk-low)" : p.movement_quality_change < 0
    ? "var(--risk-critical)" : "var(--slate-500)";
  const rColor = p.injury_risk_change < 0
    ? "var(--risk-low)" : p.injury_risk_change > 0
    ? "var(--risk-critical)" : "var(--slate-500)";

  return (
    <SectionCard title="📈 Progress vs Previous Report">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div style={{
          padding: "12px", background: "var(--ice-50)",
          borderRadius: "8px", border: "1px solid var(--slate-200)"
        }}>
          <div style={{ fontSize: "12px", color: "var(--slate-500)", marginBottom: "4px" }}>
            Movement Quality Change
          </div>
          <div className="font-mono" style={{ fontSize: "20px", color: qColor, fontWeight: 700 }}>
            {p.movement_quality_change > 0 ? "+" : ""}{p.movement_quality_change}
          </div>
          <div style={{ fontSize: "11px", color: "var(--slate-500)", marginTop: "2px" }}>
            Previously: {previous.movement_quality_score}/100 ({previous.quality_label})
          </div>
          <div style={{ fontSize: "11px", marginTop: "4px", textTransform: "capitalize", color: qColor }}>
            {p.movement_quality_trend}
          </div>
        </div>
        <div style={{
          padding: "12px", background: "var(--ice-50)",
          borderRadius: "8px", border: "1px solid var(--slate-200)"
        }}>
          <div style={{ fontSize: "12px", color: "var(--slate-500)", marginBottom: "4px" }}>
            Injury Risk Change
          </div>
          <div className="font-mono" style={{ fontSize: "20px", color: rColor, fontWeight: 700 }}>
            {p.injury_risk_change > 0 ? "+" : ""}{p.injury_risk_change}
          </div>
          <div style={{ fontSize: "11px", color: "var(--slate-500)", marginTop: "2px" }}>
            Previously: {previous.injury_risk_score} ({previous.risk_category})
          </div>
          <div style={{ fontSize: "11px", marginTop: "4px", textTransform: "capitalize", color: rColor }}>
            {p.injury_risk_trend}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function BiomechanicsReport({ report }) {
  if (!report) return null;

  const {
    report_id,
    generated_at,
    video_filename,
    athlete,
    analysis_details,
    overall_assessment,
    movement_quality,
    injury_risk,
    ai_findings,
    biomechanical_metrics,
    recommendations,
    performance_summary,
  } = report;

  const severityColor = {
    High: "var(--risk-critical)",
    Moderate: "var(--risk-moderate)",
    Low: "var(--risk-low)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      {/* Report Header */}
      <div className="card" style={{ marginBottom: "16px", background: "var(--navy-950)" }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "flex-start", flexWrap: "wrap", gap: "12px"
        }}>
          <div>
            <h2 className="font-display" style={{ fontSize: "18px", margin: "0 0 4px", color: "#fff" }}>
              Sports Injury Risk Assessment
            </h2>
            <p className="font-mono" style={{ fontSize: "11px", color: "var(--blue-400)", margin: 0 }}>
              {report_id} · {analysis_details?.analysis_date} {analysis_details?.analysis_time}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            {athlete && (
              <div style={{ fontSize: "13px", color: "#fff", fontWeight: 600 }}>
                {athlete.name}
                {athlete.sport_type && (
                  <span style={{ color: "var(--blue-400)", marginLeft: "8px", fontWeight: 400 }}>
                    {athlete.sport_type}
                  </span>
                )}
              </div>
            )}
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginTop: "4px" }}>
              {video_filename} · {analysis_details?.frames_analyzed} frames ·{" "}
              AI Confidence: {analysis_details?.ai_confidence}%
            </div>
          </div>
        </div>
      </div>

      {/* Overall Assessment */}
      <SectionCard title="🏥 Overall Assessment">
        <p style={{ fontSize: "14px", lineHeight: 1.7, margin: 0 }}>{overall_assessment}</p>
      </SectionCard>

      {/* Progress Tracking */}
      <ProgressCard reportId={report_id} />

      {/* Score Cards */}
      <div className="stat-grid" style={{ marginBottom: "16px" }}>
        <div className="card">
          <p style={{ fontSize: "12px", color: "var(--slate-500)", margin: "0 0 6px" }}>
            Movement Quality
          </p>
          <div className="score-display">
            <span className="score-number">{movement_quality?.score}</span>
            <span className="score-max">/ 100</span>
          </div>
          {movement_quality?.label && (
            <Badge text={movement_quality.label} type="quality" />
          )}
          <p style={{ fontSize: "12px", color: "var(--slate-500)", margin: "8px 0 0", lineHeight: 1.5 }}>
            {movement_quality?.interpretation}
          </p>
        </div>

        {injury_risk?.score != null && (
          <div className="card">
            <p style={{ fontSize: "12px", color: "var(--slate-500)", margin: "0 0 6px" }}>
              Injury Risk Score
            </p>
            <div className="score-display">
              <span className="score-number">{injury_risk.score}</span>
              <span className="score-max">/ 100</span>
            </div>
            <Badge text={injury_risk.category} />
            {injury_risk.injury_probability != null && (
              <p style={{ fontSize: "12px", color: "var(--slate-500)", margin: "8px 0 0" }}>
                Estimated injury probability: <strong>{injury_risk.injury_probability}%</strong>
              </p>
            )}
          </div>
        )}

        {performance_summary && (
          <div className="card">
            <p style={{ fontSize: "12px", color: "var(--slate-500)", margin: "0 0 6px" }}>
              Training Readiness
            </p>
            <div style={{
              fontSize: "16px", fontWeight: 700, fontFamily: "var(--font-display)",
              color: performance_summary.readiness_status === "Cleared for Training"
                ? "var(--risk-low)" : performance_summary.readiness_status === "Train with Caution"
                ? "var(--risk-moderate)" : "var(--risk-critical)",
              marginBottom: "8px"
            }}>
              {performance_summary.readiness_status}
            </div>
            <p style={{ fontSize: "12px", color: "var(--slate-500)", margin: 0 }}>
              Overall score: {performance_summary.overall_score}/100 ·{" "}
              {performance_summary.anomalies_detected} findings
              {performance_summary.high_severity_findings > 0 && (
                <span style={{ color: "var(--risk-critical)" }}>
                  {" "}({performance_summary.high_severity_findings} high severity)
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* AI Findings */}
      {ai_findings?.findings?.length > 0 && (
        <SectionCard title="🤖 AI Movement Analysis Findings">
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {ai_findings.findings.map((finding, i) => (
              <div key={i} style={{
                padding: "12px 14px",
                borderRadius: "8px",
                border: `1px solid ${finding.severity === "High"
                  ? "rgba(239,68,68,0.25)"
                  : finding.severity === "Moderate"
                  ? "rgba(245,158,11,0.25)"
                  : "rgba(22,199,132,0.25)"}`,
                background: finding.severity === "High"
                  ? "rgba(239,68,68,0.04)"
                  : finding.severity === "Moderate"
                  ? "rgba(245,158,11,0.04)"
                  : "rgba(22,199,132,0.04)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <strong style={{ fontSize: "13px" }}>{finding.finding}</strong>
                  <span style={{
                    fontSize: "11px", fontWeight: 600,
                    color: severityColor[finding.severity] || "var(--slate-500)"
                  }}>
                    {finding.severity} Severity
                  </span>
                </div>
                <p style={{ fontSize: "13px", color: "var(--slate-500)", margin: "0 0 4px", lineHeight: 1.5 }}>
                  {finding.detail}
                </p>
                <p style={{ fontSize: "11px", margin: 0, color: "var(--slate-500)" }}>
                  Risk area: <strong>{finding.risk_area}</strong>
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Injury Category Predictions */}
      {injury_risk?.injury_categories?.length > 0 && (
        <SectionCard title="🎯 Possible Injury Predictions">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px" }}>
            {injury_risk.injury_categories.map((cat, i) => (
              <div key={i} style={{
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid var(--slate-200)",
                background: "var(--ice-50)"
              }}>
                <div style={{ fontWeight: 600, fontSize: "13px", marginBottom: "6px" }}>{cat.injury}</div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{
                    height: "4px", flex: 1, background: "var(--slate-200)",
                    borderRadius: "2px", overflow: "hidden"
                  }}>
                    <div style={{
                      height: "100%",
                      width: `${cat.probability}%`,
                      background: cat.level === "High"
                        ? "var(--risk-critical)"
                        : cat.level === "Moderate"
                        ? "var(--risk-moderate)"
                        : "var(--risk-low)",
                      borderRadius: "2px"
                    }} />
                  </div>
                  <span className="font-mono" style={{ fontSize: "12px", minWidth: "32px" }}>
                    {cat.probability}%
                  </span>
                </div>
                <Badge text={`${cat.level} Risk`} />
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Risk Score Breakdown */}
      {injury_risk?.breakdown && (
        <SectionCard title="📊 Risk Score Breakdown">
          <table className="data-table">
            <tbody>
              <MetricRow label="Biomechanical Deviations (35%)"
                value={injury_risk.breakdown.biomechanical_deviations} unit="/100" />
              <MetricRow label="Historical Injury Factors (20%)"
                value={injury_risk.breakdown.historical_injury_factors} unit="/100" />
              <MetricRow label="Movement Asymmetry (20%)"
                value={injury_risk.breakdown.movement_asymmetry} unit="/100" />
              <MetricRow label="Training Load Indicators (15%)"
                value={injury_risk.breakdown.training_load_indicators} unit="/100" />
              <MetricRow label="Fatigue Indicators (10%)"
                value={injury_risk.breakdown.fatigue_indicators} unit="/100" />
            </tbody>
          </table>
        </SectionCard>
      )}

      {/* Biomechanical Metrics */}
      <SectionCard title="📐 Biomechanical Measurements">
        <table className="data-table">
          <tbody>
            <MetricRow label="Left Knee Angle (avg)" value={biomechanical_metrics?.knee_angle?.left_avg} unit="°" />
            <MetricRow label="Right Knee Angle (avg)" value={biomechanical_metrics?.knee_angle?.right_avg} unit="°" />
            <MetricRow label="Left Hip Angle (avg)" value={biomechanical_metrics?.hip_angle?.left_avg} unit="°" />
            <MetricRow label="Right Hip Angle (avg)" value={biomechanical_metrics?.hip_angle?.right_avg} unit="°" />
            <MetricRow label="Trunk Lean" value={biomechanical_metrics?.trunk_lean_avg} />
            <MetricRow label="Knee Valgus Ratio" value={biomechanical_metrics?.knee_valgus_ratio_avg} />
            <MetricRow label="Knee Symmetry Difference" value={biomechanical_metrics?.knee_symmetry_diff_avg} unit="°" />
            <MetricRow label="Hip Symmetry Difference" value={biomechanical_metrics?.hip_symmetry_diff_avg} unit="°" />
            <MetricRow label="Balance Offset" value={biomechanical_metrics?.balance_offset_avg} />
          </tbody>
        </table>
      </SectionCard>

      {/* Recommendations */}
      {recommendations && (
        <>
          {recommendations.corrective_exercises?.length > 0 && (
            <SectionCard title="🏃 Corrective Exercises">
              <ul style={{ margin: 0, paddingLeft: "18px" }}>
                {recommendations.corrective_exercises.map((ex, i) => (
                  <li key={i} style={{ fontSize: "13px", lineHeight: 1.7, marginBottom: "4px" }}>{ex}</li>
                ))}
              </ul>
            </SectionCard>
          )}

          {recommendations.strengthening_recommendations?.length > 0 && (
            <SectionCard title="💪 Strengthening Programme">
              <ul style={{ margin: 0, paddingLeft: "18px" }}>
                {recommendations.strengthening_recommendations.map((ex, i) => (
                  <li key={i} style={{ fontSize: "13px", lineHeight: 1.7, marginBottom: "4px" }}>{ex}</li>
                ))}
              </ul>
            </SectionCard>
          )}

          {recommendations.mobility_improvements?.length > 0 && (
            <SectionCard title="🧘 Mobility & Flexibility">
              <ul style={{ margin: 0, paddingLeft: "18px" }}>
                {recommendations.mobility_improvements.map((ex, i) => (
                  <li key={i} style={{ fontSize: "13px", lineHeight: 1.7, marginBottom: "4px" }}>{ex}</li>
                ))}
              </ul>
            </SectionCard>
          )}

          {recommendations.recovery_planning?.length > 0 && (
            <SectionCard title="🛌 Recovery Planning">
              <ul style={{ margin: 0, paddingLeft: "18px" }}>
                {recommendations.recovery_planning.map((item, i) => (
                  <li key={i} style={{ fontSize: "13px", lineHeight: 1.7, marginBottom: "4px" }}>{item}</li>
                ))}
              </ul>
            </SectionCard>
          )}

          {recommendations.training_modifications?.length > 0 && (
            <SectionCard title="⚙️ Training Modifications">
              <ul style={{ margin: 0, paddingLeft: "18px" }}>
                {recommendations.training_modifications.map((item, i) => (
                  <li key={i} style={{ fontSize: "13px", lineHeight: 1.7, marginBottom: "4px" }}>{item}</li>
                ))}
              </ul>
            </SectionCard>
          )}
        </>
      )}

      {/* Doctor note */}
      <div className="card" style={{
        background: "rgba(11,95,255,0.04)",
        border: "1px solid rgba(11,95,255,0.15)"
      }}>
        <p style={{ fontSize: "12px", color: "var(--slate-500)", margin: 0, lineHeight: 1.6 }}>
          <strong style={{ color: "var(--blue-600)" }}>⚕️ Clinical Note:</strong>{" "}
          This AI-generated report is intended to assist trained sports professionals. It does not
          replace a clinical diagnosis. All recommendations should be reviewed by a qualified
          physiotherapist or sports medicine practitioner before implementation.
          Report ID: <span className="font-mono">{report_id}</span>
        </p>
      </div>
    </div>
  );
}

export default BiomechanicsReport;