import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { api } from "../api";
import ScoreGauge from "../components/ScoreGauge";
import PoseLoader from "../components/PoseLoader";

const RISK_COLORS = {
  Low: "#1E9E5A",
  Moderate: "#D69A00",
  High: "#E8672A",
  Critical: "#D93A3A",
  Unknown: "#8B94A3",
};

export default function VideoDetail() {
  const { id } = useParams();
  const [video, setVideo] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const data = await api.getVideo(id);
      setVideo(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(() => {
      if (!video || video.status === "processing" || video.status === "uploaded") {
        load();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [video?.status]);

  if (error) return <div className="page"><p className="error">{error}</p></div>;
  if (!video) return <div className="page"><PoseLoader text="Loading video..." /></div>;

  const report = video.report;

  const chartData = report ? [
    { name: "Hip Stability", value: report.hip_stability_score },
    { name: "Landing Mechanics", value: report.landing_mechanics_score },
    { name: "Joint Alignment", value: report.joint_alignment_score },
    { name: "Balance", value: report.balance_score },
    { name: "Symmetry", value: report.movement_symmetry_score },
    { name: "Knee Valgus (inv)", value: report.knee_valgus_score != null ? 100 - report.knee_valgus_score : null },
  ].filter((d) => d.value != null) : [];

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>{video.filename}</h2>
        <Link to="/videos">&larr; Back to videos</Link>
      </div>

      <div className="card video-meta-card">
        <div><strong>Activity:</strong> {video.activity_type.replace("_", " ")}</div>
        <div><strong>Status:</strong> {video.status}</div>
        {video.duration_seconds && <div><strong>Duration:</strong> {video.duration_seconds}s</div>}
        {video.frames_processed && <div><strong>Frames analyzed:</strong> {video.frames_processed}</div>}
        {video.error_message && <p className="error">{video.error_message}</p>}
      </div>

      {(video.status === "processing" || video.status === "uploaded") && (
        <div className="card">
          <PoseLoader text="Running pose estimation & biomechanical analysis..." />
        </div>
      )}

      {video.status === "completed" && report && (
        <>
          <div className="card report-hero">
            <ScoreGauge
              score={report.movement_quality_score}
              label="Movement Quality"
              riskCategory={report.risk_category}
              size={180}
            />
            <div className="report-hero-details">
              <span className={`badge badge-risk`} style={{ background: RISK_COLORS[report.risk_category] }}>
                {report.risk_category} Risk
              </span>
              <p className="muted">
                Overall movement quality score combines hip stability, landing mechanics,
                joint alignment, balance, symmetry, and knee valgus indicators from the
                pose estimation pass over this clip.
              </p>
            </div>
          </div>

          <div className="card">
            <h3>Biomechanical Metrics</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D6DDD3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.value >= 70 ? "#1E9E5A" : entry.value >= 45 ? "#D69A00" : "#D93A3A"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3>Raw Joint Measurements</h3>
            <table className="table">
              <tbody>
                <tr><td>Avg. Left Knee Angle</td><td>{report.avg_left_knee_angle ?? "—"}°</td></tr>
                <tr><td>Avg. Right Knee Angle</td><td>{report.avg_right_knee_angle ?? "—"}°</td></tr>
                <tr><td>Trunk Lean</td><td>{report.trunk_lean_degrees ?? "—"}°</td></tr>
                <tr><td>Stride Length Ratio</td><td>{report.stride_length_ratio ?? "—"}</td></tr>
                <tr><td>Knee Valgus Score</td><td>{report.knee_valgus_score ?? "—"} / 100</td></tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {video.status === "failed" && (
        <div className="card">
          <p className="error">Processing failed: {video.error_message}</p>
        </div>
      )}
    </div>
  );
}
