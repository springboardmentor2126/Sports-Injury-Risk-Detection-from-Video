import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

// Milestone 4 (early/MVP slice): shapes matching backend/app/schemas.py's
// RiskHistoryEntryResponse and the risk_assessment portion of
// VideoDetailResponse. Kept local to this file (same pattern as
// DashboardPage.tsx/VideoUploadPage.tsx) since ../types doesn't have them
// yet -- move to ../types if another page ends up needing these too.

interface RiskHistoryEntry {
  prediction_id: string;
  video_id: string | null;
  injury_type: string;
  risk_score: number;
  risk_level: string; // "Low" | "Moderate" | "High" | "Critical"
  prediction_date: string;
}

interface RiskFactorData {
  key: string;
  label: string;
  points: number;
  detail: string;
}

interface RecommendationData {
  posture_correction: string | null;
  exercise_plan: string | null;
  recovery_plan: string | null;
}

interface RiskAssessmentData {
  prediction_id: string;
  injury_type: string;
  risk_score: number;
  risk_level: string;
  factors: RiskFactorData[];
  recommendation: RecommendationData | null;
  ai_narrative: string | null;
  anomalous_frames: number[];
  disclaimer: string;
  prediction_date: string;
}

interface VideoDetailData {
  video_id: string;
  file_name: string;
  upload_date: string;
  risk_assessment?: RiskAssessmentData | null;
}

const RISK_LEVEL_COLOR: Record<string, string> = {
  Low: "var(--color-risk-low)",
  Moderate: "var(--color-risk-moderate)",
  High: "var(--color-risk-high)",
  Critical: "var(--color-risk-critical)",
};

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-line bg-court-graphite p-6 ${className}`}>
      {children}
    </div>
  );
}

function csvEscape(value: string | number): string {
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadBlob(filename: string, content: BlobPart, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState<RiskHistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<RiskHistoryEntry[]>("/athletes/me/risk-history")
      .then((res) => setHistory(res.data))
      .catch(() => setError("Couldn't load report history."));
  }, []);

  function exportCsv() {
    if (!history || history.length === 0) return;
    const header = ["Date", "Video ID", "Injury Type", "Risk Score", "Risk Level"];
    const rows = history.map((h) => [
      new Date(h.prediction_date).toLocaleString(),
      h.video_id ?? "-",
      h.injury_type,
      h.risk_score,
      h.risk_level,
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
    downloadBlob("injury-risk-history.csv", csv, "text/csv;charset=utf-8;");
  }

  /**
   * Fetches the full per-video detail (GET /videos/{id}, which already
   * includes risk_assessment) and lays it out as a PDF -- entirely
   * client-side, no new backend endpoint needed. jsPDF is dynamically
   * imported so its (fairly large) bundle only loads when someone
   * actually clicks a download button, not on every page visit.
   */
  async function downloadPdf(entry: RiskHistoryEntry) {
    if (!entry.video_id) return;
    setGeneratingId(entry.prediction_id);
    try {
      const { data: detail } = await api.get<VideoDetailData>(`/videos/${entry.video_id}`);
      const assessment = detail.risk_assessment;
      if (!assessment) {
        window.alert("No risk assessment available for this video.");
        return;
      }

      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const marginX = 14;
      const pageWidth = 180;
      const pageBottom = 280;
      let y = 20;

      function ensureSpace(lineCount: number, lineHeight: number) {
        if (y + lineCount * lineHeight > pageBottom) {
          doc.addPage();
          y = 20;
        }
      }

      function addWrapped(text: string, fontSize: number, bold = false) {
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", bold ? "bold" : "normal");
        const lines: string[] = doc.splitTextToSize(text, pageWidth);
        const lineHeight = fontSize / 2 + 1.5;
        ensureSpace(lines.length, lineHeight);
        doc.text(lines, marginX, y);
        y += lines.length * lineHeight + 3;
      }

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Injury Risk Report", marginX, y);
      y += 10;

      addWrapped(`Athlete: ${user?.full_name ?? "-"}`, 10);
      addWrapped(`Video: ${detail.file_name}`, 10);
      addWrapped(`Assessment date: ${new Date(assessment.prediction_date).toLocaleString()}`, 10);
      y += 4;

      addWrapped(`Risk score: ${assessment.risk_score}/100 (${assessment.risk_level})`, 14, true);
      addWrapped(`Primary concern: ${assessment.injury_type}`, 12, true);
      y += 2;

      if (assessment.factors.length > 0) {
        addWrapped("Contributing factors", 12, true);
        for (const f of assessment.factors) {
          addWrapped(`\u2022 ${f.detail}`, 10);
        }
        y += 2;
      }

      if (assessment.ai_narrative) {
        addWrapped("Summary", 12, true);
        addWrapped(assessment.ai_narrative, 10);
        y += 2;
      }

      if (assessment.recommendation) {
        addWrapped("Recommendations", 12, true);
        addWrapped(`Posture correction: ${assessment.recommendation.posture_correction ?? "-"}`, 10);
        addWrapped(`Exercise plan: ${assessment.recommendation.exercise_plan ?? "-"}`, 10);
        addWrapped(`Recovery plan: ${assessment.recommendation.recovery_plan ?? "-"}`, 10);
        y += 2;
      }

      addWrapped(assessment.disclaimer, 8);

      const safeName = detail.file_name.replace(/[^a-zA-Z0-9._-]/g, "_");
      doc.save(`injury-risk-report-${safeName}.pdf`);
    } catch {
      window.alert("Couldn't generate the PDF report. Try again.");
    } finally {
      setGeneratingId(null);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-2xl font-semibold">Reports history</p>
          <p className="text-sm text-text-muted">
            Download a PDF report for any analyzed video, or export your full history as CSV.
          </p>
        </div>
        <button
          onClick={exportCsv}
          disabled={!history || history.length === 0}
          className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-text-primary transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Export as CSV
        </button>
      </div>

      {error && <p className="text-sm text-risk-high">{error}</p>}

      {!history ? (
        <Card>
          <p className="text-sm text-text-muted">Loading report history…</p>
        </Card>
      ) : history.length === 0 ? (
        <Card className="border-dashed text-center">
          <p className="text-sm text-text-muted">
            No injury risk reports yet. Upload a video to get your first assessment.
          </p>
        </Card>
      ) : (
        <Card className="p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-text-muted">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Injury type</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Level</th>
                <th className="px-4 py-3 text-right">Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {history.map((entry) => {
                const color = RISK_LEVEL_COLOR[entry.risk_level] ?? "var(--color-text-muted)";
                return (
                  <tr key={entry.prediction_id}>
                    <td className="px-4 py-3 text-text-muted">
                      {new Date(entry.prediction_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-text-primary">{entry.injury_type}</td>
                    <td className="px-4 py-3 font-data" style={{ color }}>
                      {Math.round(entry.risk_score)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-semibold uppercase"
                        style={{ color, border: `1px solid ${color}` }}
                      >
                        {entry.risk_level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => downloadPdf(entry)}
                        disabled={!entry.video_id || generatingId === entry.prediction_id}
                        className="text-xs text-pulse-cyan hover:underline disabled:opacity-50"
                      >
                        {generatingId === entry.prediction_id ? "Generating…" : "Download PDF"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
