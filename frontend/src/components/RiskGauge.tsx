import type { RiskLevel } from "../types";

interface RiskGaugeProps {
  /** 0-100. Pass null to render an empty "no data yet" ring. */
  score: number | null;
  level?: RiskLevel;
  size?: number;
  label?: string;
}

const RISK_COLOR: Record<RiskLevel, string> = {
  low: "var(--color-risk-low)",
  moderate: "var(--color-risk-moderate)",
  high: "var(--color-risk-high)",
  critical: "var(--color-risk-critical)",
};

const RISK_TEXT: Record<RiskLevel, string> = {
  low: "Low risk",
  moderate: "Moderate risk",
  high: "High risk",
  critical: "Critical risk",
};

/**
 * Signature element for the app: a dial styled after a heart-rate /
 * biometric monitor ring, since that's the closest real-world instrument
 * to what this number means (an athlete's injury risk score).
 */
export function RiskGauge({ score, level, size = 140, label }: RiskGaugeProps) {
  const strokeWidth = size * 0.08;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const hasData = score !== null && level !== undefined;
  const progress = hasData ? Math.min(Math.max(score, 0), 100) / 100 : 0;
  const dashOffset = circumference * (1 - progress);
  const color = hasData ? RISK_COLOR[level] : "var(--color-line)";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-line)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={hasData ? dashOffset : circumference}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-data text-2xl font-semibold"
            style={{ color: hasData ? color : "var(--color-text-muted)" }}
          >
            {hasData ? Math.round(score) : "—"}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-text-muted">
            {hasData ? RISK_TEXT[level] : "No data yet"}
          </span>
        </div>
      </div>
      {label && (
        <span className="text-sm text-text-muted font-body">{label}</span>
      )}
    </div>
  );
}
