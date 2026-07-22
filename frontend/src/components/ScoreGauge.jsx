import React, { useEffect, useState } from "react";

const COLORS = {
  Low: "#1E9E5A",
  Moderate: "#D69A00",
  High: "#E8672A",
  Critical: "#D93A3A",
  Unknown: "#8B94A3",
};

export default function ScoreGauge({ score, label, riskCategory, size = 160 }) {
  const [animated, setAnimated] = useState(0);
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeScore = score == null ? 0 : Math.max(0, Math.min(100, score));
  const color = COLORS[riskCategory] || "#3A36E0";

  useEffect(() => {
    const t = setTimeout(() => setAnimated(safeScore), 80);
    return () => clearTimeout(t);
  }, [safeScore]);

  const offset = circumference - (animated / 100) * circumference;

  return (
    <div className="score-gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="#E4E9E1" strokeWidth="12" fill="none"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth="12" fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div className="score-gauge-label">
        <span className="score-gauge-value">{score == null ? "—" : Math.round(score)}</span>
        {label && <span className="score-gauge-caption">{label}</span>}
      </div>
    </div>
  );
}
