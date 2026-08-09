import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

function riskBadgeClass(category) {
  if (!category) return "";
  const c = category.toLowerCase();
  if (c.includes("low")) return "low";
  if (c.includes("moderate")) return "moderate";
  if (c.includes("high")) return "high";
  if (c.includes("critical")) return "critical";
  return "";
}

export default function Dashboard() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    api.getDashboard(token).then(setData).finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="page-center">Loading dashboard...</div>;

  const maxTrend = data?.risk_trend?.length ? Math.max(...data.risk_trend, 10) : 10;

  return (
    <div className="page">
      <div style={{ width: "100%", maxWidth: 780 }}>
        <div className="card wide">
          <h1>Dashboard</h1>
          <p className="subtitle">{user ? `Overview for ${user.full_name}` : "Your training overview"}</p>

          <div className="stat-grid">
            <div className="stat-box"><div className="stat-label">Total videos</div><div className="stat-value">{data.total_videos}</div></div>
            <div className="stat-box"><div className="stat-label">Analyzed</div><div className="stat-value">{data.videos_analyzed}</div></div>
            <div className="stat-box"><div className="stat-label">Avg movement quality</div><div className="stat-value">{data.avg_movement_quality_score ?? "—"}</div></div>
            <div className="stat-box"><div className="stat-label">Avg risk score</div><div className="stat-value">{data.avg_overall_risk_score ?? "—"}</div></div>
          </div>

          {data.latest_risk_category && (
            <div style={{ marginTop: 10, marginBottom: 20 }}>
              <span style={{ fontSize: 13, color: "var(--text-dim)", marginRight: 10 }}>Latest risk category:</span>
              <span className={`badge ${riskBadgeClass(data.latest_risk_category)}`}>{data.latest_risk_category}</span>
            </div>
          )}

          {data.risk_trend && data.risk_trend.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 10 }}>
                Risk trend across videos (oldest → newest)
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120, borderBottom: "1px solid var(--border)", paddingBottom: 4 }}>
                {data.risk_trend.map((v, i) => {
                  const height = Math.max(4, (v / maxTrend) * 100);
                  const color = v >= 60 ? "var(--error)" : v >= 30 ? "var(--warning)" : "var(--success)";
                  return (
                    <div key={i} title={`${v}`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
                      <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4 }}>{v}</div>
                      <div style={{ width: "60%", height: `${height}%`, background: color, borderRadius: "3px 3px 0 0" }} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {data.total_videos === 0 && (
            <p className="subtitle" style={{ marginTop: 20 }}>
              No videos yet — upload one from the Videos page to start seeing your movement and injury risk trends here.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
