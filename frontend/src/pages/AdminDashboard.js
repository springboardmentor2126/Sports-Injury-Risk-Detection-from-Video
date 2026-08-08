import { useEffect, useState } from "react";
import api from "../api/api";
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import "../styles/dashboard.css";
 
const COLORS = ["#2563EB", "#22C55E", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899", "#84CC16"];
 
const RISK_COLORS = {
  Low: "#22C55E",
  Moderate: "#F59E0B",
  High: "#EF4444",
  Critical: "#991B1B",
};
 
function KpiCard({ title, value }) {
  return (
    <div style={{
      background: "#fff", borderRadius: "12px", padding: "20px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    }}>
      <div style={{ color: "#64748B", fontSize: "13px", marginBottom: "6px" }}>{title}</div>
      <div style={{ fontSize: "28px", fontWeight: 800, color: "#0F172A" }}>{value}</div>
    </div>
  );
}
 
function ChartCard({ title, children, subtitle }) {
  return (
    <div style={{
      background: "#fff", borderRadius: "12px", padding: "20px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.08)", marginBottom: "24px",
    }}>
      <h3 style={{ margin: "0 0 4px" }}>{title}</h3>
      {subtitle && <p style={{ color: "#64748B", fontSize: "13px", marginTop: 0 }}>{subtitle}</p>}
      {children}
    </div>
  );
}
 
function AdminDashboard() {
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = currentUser.role === "Administrator";
 
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
 
  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    const fetchDashboard = async () => {
      try {
        const res = await api.get("/admin/dashboard");
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to load admin dashboard.");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
 
  if (!isAdmin) {
    return (
      <div className="page">
        <div className="container" style={{ padding: "60px 20px", textAlign: "center" }}>
          <h3>Access Denied</h3>
          <p style={{ color: "#64748B" }}>This dashboard is only available to Administrator accounts.</p>
        </div>
      </div>
    );
  }
 
  if (loading) {
    return (
      <div className="page">
        <div className="container" style={{ padding: "60px 20px", textAlign: "center" }}>
          <p>Loading platform analytics...</p>
        </div>
      </div>
    );
  }
 
  if (error) {
    return (
      <div className="page">
        <div className="container" style={{ padding: "60px 20px", textAlign: "center" }}>
          <h3>Couldn't load dashboard</h3>
          <p style={{ color: "#DC2626" }}>{error}</p>
        </div>
      </div>
    );
  }
 
  const { kpis, user_distribution, sports_distribution, injury_risk_by_sport,
    risk_level_distribution, injury_type_distribution, monthly_upload_trend,
    monthly_analysis_trend, average_risk_score, highest_risk_sports, recent_activity } = data;
 
  return (
    <div className="page">
      <div className="container" style={{ padding: "30px 20px" }}>
        <h1 className="dashboard-title">Admin Analytics Dashboard</h1>
        <p className="dashboard-subtitle">Platform-wide overview - all data live from PostgreSQL</p>
 
        {/* ---------------- KPI Cards ---------------- */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", margin: "24px 0" }}>
          <KpiCard title="Total Registered Users" value={kpis.total_registered_users} />
          <KpiCard title="Total Athletes" value={kpis.total_athletes} />
          <KpiCard title="Total Coaches" value={kpis.total_coaches} />
          <KpiCard title="Total Physiotherapists" value={kpis.total_physiotherapists} />
          <KpiCard title="Total Sports Scientists" value={kpis.total_sports_scientists} />
          <KpiCard title="Total Videos Uploaded" value={kpis.total_videos_uploaded} />
          <KpiCard title="Total Completed Analyses" value={kpis.total_completed_analyses} />
          <KpiCard title="Total Reports Generated" value={kpis.total_reports_generated} />
          <KpiCard title="Total Active Users" value={kpis.total_active_users} />
          <KpiCard title="Average Risk Score" value={average_risk_score !== null ? `${average_risk_score}%` : "—"} />
        </div>
 
        {/* ---------------- Pie Charts Row ---------------- */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
          <ChartCard title="User Distribution">
            {user_distribution.length === 0 ? <p style={{ color: "#94A3B8" }}>No data yet.</p> : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={user_distribution} dataKey="count" nameKey="role" cx="50%" cy="50%" outerRadius={90}
                       label={(e) => `${e.role} ${e.percentage}%`}>
                    {user_distribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
 
          <ChartCard title="Sports Distribution">
            {sports_distribution.length === 0 ? <p style={{ color: "#94A3B8" }}>No sport data yet - athletes haven't filled in their sport type.</p> : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={sports_distribution} dataKey="count" nameKey="sport" cx="50%" cy="50%" outerRadius={90}
                       label={(e) => `${e.sport} ${e.percentage}%`}>
                    {sports_distribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
 
          <ChartCard title="Risk Level Distribution">
            {risk_level_distribution.length === 0 ? <p style={{ color: "#94A3B8" }}>No completed analyses yet.</p> : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={risk_level_distribution} dataKey="count" nameKey="risk_level" cx="50%" cy="50%" outerRadius={90}
                       label={(e) => `${e.risk_level} ${e.percentage}%`}>
                    {risk_level_distribution.map((entry, i) => (
                      <Cell key={i} fill={RISK_COLORS[entry.risk_level] || COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
 
          <ChartCard title="Injury Type Distribution" subtitle="Share of analyses flagging each category High/Critical">
            {injury_type_distribution.length === 0 ? <p style={{ color: "#94A3B8" }}>No completed analyses yet.</p> : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={injury_type_distribution} dataKey="count" nameKey="injury_type" cx="50%" cy="50%" outerRadius={90}
                       label={(e) => `${e.injury_type} ${e.percentage}%`}>
                    {injury_type_distribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
 
        {/* ---------------- Bar Chart ---------------- */}
        <ChartCard title="Injury Risk by Sport" subtitle="Average overall risk score per sport">
          {injury_risk_by_sport.length === 0 ? <p style={{ color: "#94A3B8" }}>No data yet.</p> : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={injury_risk_by_sport}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="sport" />
                <YAxis domain={[0, 100]} unit="%" />
                <Tooltip />
                <Bar dataKey="average_risk_score" fill="#2563EB" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
 
        {/* ---------------- Line Charts ---------------- */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
          <ChartCard title="Monthly Upload Trend">
            {monthly_upload_trend.length === 0 ? <p style={{ color: "#94A3B8" }}>No uploads yet.</p> : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={monthly_upload_trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
 
          <ChartCard title="Monthly Analysis Trend">
            {monthly_analysis_trend.length === 0 ? <p style={{ color: "#94A3B8" }}>No completed analyses yet.</p> : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={monthly_analysis_trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#22C55E" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
 
        {/* ---------------- Highest Risk Sports Table ---------------- */}
        <ChartCard title="Highest Risk Sports">
          {highest_risk_sports.length === 0 ? <p style={{ color: "#94A3B8" }}>No data yet.</p> : (
            <div className="profiles-table-wrapper">
              <table className="profiles-table">
                <thead>
                  <tr>
                    <th>Sport</th>
                    <th>Average Risk Score</th>
                    <th>Number of Athletes</th>
                    <th>Number of Analyses</th>
                  </tr>
                </thead>
                <tbody>
                  {highest_risk_sports.map((s, i) => (
                    <tr key={i}>
                      <td>{s.sport}</td>
                      <td>{s.average_risk_score}%</td>
                      <td>{s.athlete_count}</td>
                      <td>{s.analysis_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>
 
        {/* ---------------- Recent Activity ---------------- */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
          <ChartCard title="Recent Users">
            {recent_activity.recent_users.map((u, i) => (
              <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid #F1F5F9", fontSize: "13px" }}>
                <strong>{u.name}</strong> ({u.role}) — {u.email}
              </div>
            ))}
          </ChartCard>
          <ChartCard title="Recent Videos">
            {recent_activity.recent_videos.map((v, i) => (
              <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid #F1F5F9", fontSize: "13px" }}>
                {v.filename}
              </div>
            ))}
          </ChartCard>
          <ChartCard title="Recent Analyses">
            {recent_activity.recent_analyses.map((a, i) => (
              <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid #F1F5F9", fontSize: "13px" }}>
                #{a.analysis_id} — <span style={{ color: RISK_COLORS[a.risk_level] || "#334155", fontWeight: 700 }}>{a.risk_level}</span> ({a.overall_risk_score}%)
              </div>
            ))}
          </ChartCard>
          <ChartCard title="Recent Reports">
            {recent_activity.recent_reports.map((r, i) => (
              <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid #F1F5F9", fontSize: "13px" }}>
                {r.report_name}
              </div>
            ))}
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
 
export default AdminDashboard;
 