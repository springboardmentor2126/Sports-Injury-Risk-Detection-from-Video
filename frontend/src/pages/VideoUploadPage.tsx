import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { RiskGauge } from "../components/RiskGauge";
import type { VideoDetail, VideoSummary, VideoStatus, RiskLevel } from "../types";

const ACCEPTED = ".mp4,.mov,.avi,.mkv";

const STATUS_COLOR: Record<VideoStatus, string> = {
  uploaded: "var(--color-text-muted)",
  processing: "var(--color-risk-moderate)",
  completed: "var(--color-risk-low)",
  failed: "var(--color-risk-high)",
};

// Milestone 3: shape of backend/app/schemas.py's RiskFactorResponse /
// RecommendationResponse / RiskAssessmentResponse, as embedded in
// VideoDetailResponse.risk_assessment. Kept local (same as
// DashboardPage.tsx's RiskHistoryEntry) since types.ts isn't available
// here -- move these into ../types if/when convenient.
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
  risk_level: string; // "Low" | "Moderate" | "High" | "Critical" from the API
  factors: RiskFactorData[];
  recommendation: RecommendationData | null;
  // Best-effort AI-written narrative paragraph (Grok primary, Gemini
  // fallback -- see backend/app/services/report_writer.py). null if it
  // couldn't be generated for any reason -- everything else on this
  // object is unaffected either way.
  ai_narrative: string | null;
  anomalous_frames: number[];
  disclaimer: string;
  prediction_date: string;
}

// VideoDetail (from ../types) predates Milestone 3 and won't have this
// field typed yet -- extend it locally rather than assuming ../types has
// been updated.
type VideoDetailWithRisk = VideoDetail & { risk_assessment?: RiskAssessmentData | null };

// Same capitalized-API -> lowercase-union conversion as DashboardPage.tsx.
function toRiskLevel(level: string): RiskLevel {
  return level.toLowerCase() as RiskLevel;
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

function Metric({ label, value, unit = "" }: { label: string; value: number | null; unit?: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-text-muted">{label}</dt>
      <dd className="font-data text-xl text-text-primary">
        {value === null ? "—" : `${value}${unit}`}
      </dd>
    </div>
  );
}

function RecommendationBlock({ title, text }: { title: string; text: string | null }) {
  return (
    <div className="rounded-lg border border-line bg-court-graphite-light p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{title}</p>
      <p className="mt-1 whitespace-pre-line text-sm text-text-primary">{text ?? "—"}</p>
    </div>
  );
}

/** Compact badge for a video history row -- full RiskGauge is too big for a list item. */
function RiskBadge({ assessment }: { assessment: RiskAssessmentData }) {
  const color = RISK_LEVEL_COLOR[assessment.risk_level] ?? "var(--color-text-muted)";
  return (
    <span className="flex items-center gap-2 text-xs">
      <span
        className="rounded-full px-2 py-0.5 font-semibold uppercase"
        style={{ color, border: `1px solid ${color}` }}
      >
        {assessment.risk_level} · {Math.round(assessment.risk_score)}
      </span>
    </span>
  );
}

/**
 * Full risk breakdown -- gauge, contributing factors, AI narrative (if
 * generated), posture/exercise/recovery recommendations, disclaimer.
 * Shared between the "Latest result" card (right after upload) and an
 * expanded History row (reviewing a past video later) so a full report
 * is always reachable, not just immediately after uploading.
 */
function RiskAssessmentDetail({ assessment, gaugeSize = 120 }: { assessment: RiskAssessmentData; gaugeSize?: number }) {
  return (
    <div>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <RiskGauge
          score={assessment.risk_score}
          level={toRiskLevel(assessment.risk_level)}
          label="Injury risk score"
          size={gaugeSize}
        />
        <div className="flex-1">
          <p className="font-display text-sm font-semibold uppercase tracking-wide text-text-muted">
            {assessment.injury_type}
          </p>
          {assessment.factors.length > 0 && (
            <ul className="mt-2 space-y-1.5 text-xs text-text-muted">
              {assessment.factors.map((f) => (
                <li key={f.key}>• {f.detail}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {assessment.ai_narrative && (
        <div className="mt-4 rounded-lg border border-line bg-court-graphite-light p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">Summary</p>
          <p className="text-sm text-text-primary">{assessment.ai_narrative}</p>
        </div>
      )}

      {assessment.recommendation && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <RecommendationBlock title="Posture correction" text={assessment.recommendation.posture_correction} />
          <RecommendationBlock title="Exercise plan" text={assessment.recommendation.exercise_plan} />
          <RecommendationBlock title="Recovery plan" text={assessment.recommendation.recovery_plan} />
        </div>
      )}

      <p className="mt-4 text-xs text-text-muted">{assessment.disclaimer}</p>
    </div>
  );
}

/**
 * Fetches a video through the authenticated API (as a blob, since a
 * plain <video src="..."> request can't carry an Authorization header)
 * and plays it locally via an object URL. Cleans the object URL up on
 * unmount / when the source video_id changes, so repeated plays don't
 * leak memory.
 */
function AnnotatedVideoPlayer({ videoId }: { videoId: string }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let currentUrl: string | null = null;
    let cancelled = false;

    setLoading(true);
    setError(false);

    api
      .get(`/videos/${videoId}/annotated`, { responseType: "blob" })
      .then((res) => {
        if (cancelled) return;
        currentUrl = URL.createObjectURL(res.data);
        setObjectUrl(currentUrl);
      })
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [videoId]);

  if (loading) return <p className="text-sm text-text-muted">Loading annotated video…</p>;
  if (error || !objectUrl) return <p className="text-sm text-risk-high">Couldn't load annotated video.</p>;

  return (
    <video
      src={objectUrl}
      controls
      loop
      className="w-full rounded-lg border border-line"
      style={{ maxHeight: 480, backgroundColor: "black" }}
    />
  );
}

export function VideoUploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VideoDetailWithRisk | null>(null);
  const [history, setHistory] = useState<VideoSummary[]>([]);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Async upload (backend now returns 202 immediately and processes in a
  // background task -- see routers/video.py): this tracks "a video is
  // currently being analyzed" so the UI can show a lightweight status
  // instead of disabling the whole page for the length of the analysis.
  // The person can keep browsing, upload a different file, navigate away,
  // etc. while this is set.
  const [processingVideoId, setProcessingVideoId] = useState<string | null>(null);
  const cancelledRef = useRef(false);
  // Milestone 3: risk_assessment isn't in the lightweight GET /videos/ list
  // response -- only fetched (and cached) per-video, lazily, the same way
  // the annotated video itself is only loaded when a row is expanded.
  const [historyDetails, setHistoryDetails] = useState<Record<string, VideoDetailWithRisk>>({});
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      cancelledRef.current = true; // stop any in-flight poll loop from touching state after unmount
    };
  }, []);

  function loadHistory() {
    api.get<VideoSummary[]>("/videos/").then((res) => setHistory(res.data)).catch(() => {});
  }

  useEffect(() => {
    loadHistory();
  }, []);

  const POLL_INTERVAL_MS = 2000;

  function pollUntilDone(videoId: string) {
    const poll = () => {
      if (cancelledRef.current) return;
      api
        .get<VideoDetailWithRisk>(`/videos/${videoId}`)
        .then((res) => {
          if (cancelledRef.current) return;
          const video = res.data;
          if (video.status === "completed" || video.status === "failed") {
            setResult(video);
            setProcessingVideoId(null);
            loadHistory(); // pick up the now-final status/has_annotated_video in the list too
          } else {
            setTimeout(poll, POLL_INTERVAL_MS);
          }
        })
        .catch(() => {
          // Transient network hiccup -- keep trying rather than giving up
          // silently; a real failure surfaces via status "failed" instead.
          if (!cancelledRef.current) setTimeout(poll, POLL_INTERVAL_MS);
        });
    };
    poll();
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true); // brief -- just for the initial upload request itself
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const { data } = await api.post<VideoSummary>("/videos/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      // Response comes back immediately with status "uploaded" -- no
      // biomechanics_summary/risk_assessment yet, that's what polling is for.
      setProcessingVideoId(data.video_id);
      loadHistory();
      pollUntilDone(data.video_id);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Upload failed. Try a shorter, well-lit clip.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSelectedFile(null);
    }
  }

  async function handleDelete(videoId: string, fileName: string) {
    if (!window.confirm(`Delete "${fileName}"? This can't be undone.`)) return;

    setDeletingId(videoId);
    try {
      await api.delete(`/videos/${videoId}`);
      setHistory((h) => h.filter((v) => v.video_id !== videoId));
      if (result?.video_id === videoId) setResult(null);
      if (expandedHistoryId === videoId) setExpandedHistoryId(null);
    } catch {
      window.alert("Couldn't delete this video. Try again.");
    } finally {
      setDeletingId(null);
    }
  }

  function toggleExpand(videoId: string) {
    const next = expandedHistoryId === videoId ? null : videoId;
    setExpandedHistoryId(next);
    if (next && !historyDetails[next]) {
      setLoadingDetailId(next);
      api
        .get<VideoDetailWithRisk>(`/videos/${next}`)
        .then((res) => setHistoryDetails((prev) => ({ ...prev, [next]: res.data })))
        .catch(() => {})
        .finally(() => setLoadingDetailId((id) => (id === next ? null : id)));
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <p className="font-display text-2xl font-semibold">Upload video</p>
        <p className="text-sm text-text-muted">
          Pose estimation + biomechanical analysis run automatically once you upload.
          Best results: single person, side-on view, well lit, a few seconds long.
        </p>
        <p className="mt-1 text-xs text-text-muted">
          Heads up for running/sprinting clips specifically: the knee valgus reading is
          less reliable from this side-on angle — see the note below your results.
        </p>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED}
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            className="text-sm text-text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-court-graphite-light file:px-3 file:py-2 file:text-sm file:text-text-primary"
          />
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="rounded-lg bg-pulse-cyan px-4 py-2 text-sm font-semibold text-track-slate transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Upload & analyze"}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-risk-high">{error}</p>}
      </Card>

      {processingVideoId && (
        <Card className="border-pulse-cyan/40">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 animate-pulse rounded-full bg-pulse-cyan" />
            <p className="text-sm text-text-primary">
              Analyzing your video in the background — pose estimation, biomechanics, and
              risk scoring are running now.
            </p>
          </div>
          <p className="mt-2 text-xs text-text-muted">
            Feel free to keep using the app while this finishes — upload another clip, check
            your profile, or come back later. This card updates automatically when it's done.
          </p>
        </Card>
      )}

      {result && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <p className="font-display text-sm font-semibold uppercase tracking-wide text-text-muted">
              Latest result — {result.file_name}
            </p>
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold uppercase"
              style={{ color: STATUS_COLOR[result.status], border: `1px solid ${STATUS_COLOR[result.status]}` }}
            >
              {result.status}
            </span>
          </div>

          {result.status === "failed" && (
            <p className="text-sm text-risk-high">{result.error_message}</p>
          )}

          {result.has_annotated_video && (
            <div className="mb-4">
              <AnnotatedVideoPlayer videoId={result.video_id} />
              <p className="mt-2 text-xs text-text-muted">
                Skeleton overlay on the analyzed frames (not the full original clip —
                see notes below). Cyan dots are detected joints; numbers are knee angles.
              </p>
            </div>
          )}

          {result.biomechanics_summary && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Metric label="Frames analyzed" value={result.biomechanics_summary.frames_analyzed} />
              <Metric label="Frames w/ detection" value={result.biomechanics_summary.frames_with_detection} />
              <Metric label="Avg left knee angle" value={result.biomechanics_summary.avg_left_knee_angle} unit="°" />
              <Metric label="Avg right knee angle" value={result.biomechanics_summary.avg_right_knee_angle} unit="°" />
              <Metric label="Avg trunk lean" value={result.biomechanics_summary.avg_trunk_lean_deg} unit="°" />
              <Metric label="Knee ROM asymmetry" value={result.biomechanics_summary.knee_rom_asymmetry} unit="°" />
              <Metric label="Left knee ROM" value={result.biomechanics_summary.left_knee_rom} unit="°" />
              <Metric label="Right knee ROM" value={result.biomechanics_summary.right_knee_rom} unit="°" />
            </div>
          )}

          <p className="mt-4 text-xs text-text-muted">
            Knee valgus proxy is a 2D single-camera estimate, not a clinical measurement —
            treat it as directional, not diagnostic.{" "}
            <span className="font-semibold text-text-primary">
              It's especially unreliable for running/sprinting clips:
            </span>{" "}
            a side-on camera (this page's recommended angle) mostly captures the knee's
            forward-back travel, not true inward/outward collapse — and running swings the
            knee through a large forward-back range on every single stride. Treat a "high
            valgus" flag with real skepticism on running-gait footage; for a trustworthy
            valgus reading, re-shoot from a frontal or 3/4 angle instead. "Knee ROM asymmetry"
            compares how much range of motion each leg moved through over the whole clip —
            this works for both bilateral movements (squats) and cyclical gait (running),
            unlike a same-instant left-right comparison which would flag normal running as
            falsely asymmetric. The annotated video shows the sampled frames pose estimation
            analyzed (up to 60, evenly spaced across the clip) played back at a fixed rate —
            it's a representative motion sequence, not a frame-exact replay of your original
            footage.
          </p>

          {result.risk_assessment && (
            <div className="mt-6 border-t border-line pt-6">
              <RiskAssessmentDetail assessment={result.risk_assessment} />
            </div>
          )}
        </Card>
      )}

      <Card>
        <p className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-text-muted">
          Upload history
        </p>
        {history.length === 0 ? (
          <p className="text-sm text-text-muted">No videos uploaded yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {history.map((v) => (
              <li key={v.video_id} className="py-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-primary">{v.file_name}</span>
                  <div className="flex items-center gap-3">
                    {historyDetails[v.video_id]?.risk_assessment && (
                      <RiskBadge assessment={historyDetails[v.video_id]!.risk_assessment!} />
                    )}
                    {v.has_annotated_video && (
                      <button
                        onClick={() => toggleExpand(v.video_id)}
                        className="text-xs text-pulse-cyan hover:underline"
                      >
                        {expandedHistoryId === v.video_id ? "Hide" : "View"}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(v.video_id, v.file_name)}
                      disabled={deletingId === v.video_id}
                      className="text-xs text-risk-high hover:underline disabled:opacity-50"
                    >
                      {deletingId === v.video_id ? "Deleting…" : "Delete"}
                    </button>
                    <span style={{ color: STATUS_COLOR[v.status] }} className="text-xs uppercase">
                      {v.status}
                    </span>
                  </div>
                </div>
                {expandedHistoryId === v.video_id && (
                  <div className="mt-3 space-y-3">
                    <AnnotatedVideoPlayer videoId={v.video_id} />
                    {loadingDetailId === v.video_id ? (
                      <p className="text-xs text-text-muted">Loading risk assessment…</p>
                    ) : (
                      historyDetails[v.video_id]?.risk_assessment && (
                        <div className="border-t border-line pt-3">
                          <RiskAssessmentDetail
                            assessment={historyDetails[v.video_id]!.risk_assessment!}
                            gaugeSize={96}
                          />
                        </div>
                      )
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
