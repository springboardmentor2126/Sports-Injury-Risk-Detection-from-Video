import React from "react";

function StatCard({ title, value, icon, color }) {
  return (
    <div className="stat-card">

      <div
        className="stat-icon"
        style={{
          background: `${color}20`,
          color: color
        }}
      >
        {icon}
      </div>

      <div style={{ marginTop: "20px" }}>
        <p className="stat-title">{title}</p>
        <h2 className="stat-value">{value}</h2>
      </div>

    </div>
  );
}

export default StatCard;