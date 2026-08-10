import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { RiskGauge } from "../components/RiskGauge";
import type { AthleteProfile, RiskLevel } from "../types";

// Milestone 3: shape of one row from GET /athletes/me/risk-history
// (backend/app/schemas.py's RiskHistoryEntryResponse). Kept local to this
// file rather than in ../types since it's only consumed here -- move it
// there if another page ends up needing it too.
interface RiskHistoryEntry {
  prediction_id: string;
  video_id: string | null;
  injury_type: string;
  risk_score: number;
  risk_level: string; // "Low" | "Moderate" | "High" | "Critical" from the API
  prediction_date: string;
}

// The API returns risk_level capitalized ("Low"/"Moderate"/"High"/"Critical")
// to read well in raw JSON/logs; RiskGauge's RiskLevel union is lowercase
// (matches the CSS custom-property keys in RISK_COLOR). This is the one
// conversion point between the two.
function toRiskLevel(level: string): RiskLevel {
  return level.toLowerCase() as RiskLevel;
}

const ALERT_LEVELS = new Set(["High", "Critical"]);

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-line bg-court-graphite p-6 ${className}`}>
      {children}
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [athleteCount, setAthleteCount] = useState<number | null>(null);
  // null = still loading; [] = loaded, no assessments yet
  const [riskHistory, setRiskHistory] = useState<RiskHistoryEntry[] | null>(null);

  useEffect(() => {
    if (user?.role === "athlete") {
      api
        .get<AthleteProfile>("/athletes/me")
        .then((res) => setProfile(res.data))
        .catch(() => setProfile(null));

      // Most-recent-first (see crud.get_predictions_for_athlete), so the
      // first entry is always "current" risk for the dashboard widget.
      api
        .get<RiskHistoryEntry[]>("/athletes/me/risk-history")
        .then((res) => setRiskHistory(res.data))
        .catch(() => setRiskHistory([]));
    } else {
      api
        .get<AthleteProfile[]>("/athletes/")
        .then((res) => setAthleteCount(res.data.length))
        .catch(() => setAthleteCount(null));
    }
  }, [user]);

  const riskLoading = user?.role === "athlete" && riskHistory === null;
  const latestRisk = riskHistory && riskHistory.length > 0 ? riskHistory[0] : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="font-display text-2xl font-semibold">
          Welcome back, {user?.full_name?.split(" ")[0]}
        </p>
        <p className="text-sm text-text-muted">
          {user?.role === "athlete"
            ? "Your injury risk overview, based on your most recent video analysis."
            : "Team overview across your connected athletes."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="flex flex-col items-center justify-center gap-4 md:col-span-1">
          <RiskGauge
            score={latestRisk ? latestRisk.risk_score : null}
            level={latestRisk ? toRiskLevel(latestRisk.risk_level) : undefined}
            label="Injury risk score"
          />
          <p className="text-center text-xs text-text-muted">
            {user?.role !== "athlete"
              ? "Per-athlete risk scores live on each athlete's profile."
              : riskLoading
              ? "Loading your latest assessment…"
              : !latestRisk
              ? "Upload a video to get your first risk assessment."
              : latestRisk.injury_type === "No significant risk factors detected"
              ? "No risk factors flagged in your most recent analysis."
              : `Your most recent analysis flagged: ${latestRisk.injury_type}.`}
          </p>
        </Card>

        <Card className="md:col-span-2">
          <p className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-text-muted">
            {user?.role === "athlete" ? "Your profile" : "Roster"}
          </p>

          {user?.role === "athlete" ? (
            profile ? (
              <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <Field label="Sport" value={profile.sport} />
                <Field label="Position" value={profile.position} />
                <Field label="Age" value={profile.age} />
                <Field label="Height (cm)" value={profile.height} />
                <Field label="Weight (kg)" value={profile.weight} />
                <Field label="Training load" value={profile.training_load} />
              </dl>
            ) : (
              <p className="text-sm text-text-muted">Loading profile…</p>
            )
          ) : (
            <p className="text-sm text-text-primary">
              {athleteCount === null
                ? "Loading roster…"
                : `${athleteCount} athlete profile${athleteCount === 1 ? "" : "s"} in the system.`}
            </p>
          )}

          <Link
            to="/profile"
            className="mt-4 inline-block text-sm text-pulse-cyan hover:underline"
          >
            {user?.role === "athlete" ? "Edit profile →" : "View all athletes →"}
          </Link>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <p className="mb-2 font-display text-sm font-semibold uppercase tracking-wide text-text-muted">
            Previous reports
          </p>
          <EmptyState text="No reports generated yet. This unlocks once the Reports & Export System is live." />
        </Card>

        <Card>
          <p className="mb-2 font-display text-sm font-semibold uppercase tracking-wide text-text-muted">
            Notifications
          </p>
          {user?.role !== "athlete" ? (
            <EmptyState text="High-risk movement alerts and training load warnings across your athletes will appear here in a future update." />
          ) : riskLoading ? (
            <EmptyState text="Checking for risk alerts…" />
          ) : latestRisk && ALERT_LEVELS.has(latestRisk.risk_level) ? (
            <div
              className="rounded-lg border px-4 py-3 text-sm"
              style={{
                borderColor:
                  latestRisk.risk_level === "Critical"
                    ? "var(--color-risk-critical)"
                    : "var(--color-risk-high)",
              }}
            >
              <p
                className="font-semibold"
                style={{
                  color:
                    latestRisk.risk_level === "Critical"
                      ? "var(--color-risk-critical)"
                      : "var(--color-risk-high)",
                }}
              >
                {latestRisk.risk_level} risk flagged
              </p>
              <p className="mt-1 text-text-muted">
                {latestRisk.injury_type} — open your latest video for the full breakdown and recommendations.
              </p>
            </div>
          ) : latestRisk ? (
            <EmptyState text="No high-risk movement patterns or training load warnings from your most recent analysis." />
          ) : (
            <EmptyState text="High-risk movement alerts and training load warnings will appear here once you upload a video." />
          )}
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-text-muted">{label}</dt>
      <dd className="font-data text-text-primary">{value ?? "—"}</dd>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-text-muted">
      {text}
    </p>
  );
}
