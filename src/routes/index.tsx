import { createFileRoute, Link as RouterLink } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Activity,
  AlertTriangle,
  Clock,
  Download,
  FileVideo,
  Flame,
  GitCompareArrows,
  History,
  Loader2,
  Play,
  ShieldAlert,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend as RechartsLegend,
} from "recharts";
import jsPDF from "jspdf";
import { toast, Toaster } from "sonner";
import {
  analyzePose,
  type AnalysisJoint,
  type AnalysisResult,
} from "@/lib/analyze.functions";
import {
  deleteAnalysis,
  loadHistory,
  saveAnalysis,
  shrinkDataUrl,
  type SavedAnalysis,
} from "@/lib/history";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KinetIQ — AI Sports Injury & Performance Analysis" },
      { name: "description", content: "Upload a sports clip. Get instant AI injury risk, posture score, joint heatmaps, risky-moment timeline, and side-by-side comparisons." },
      { property: "og:title", content: "KinetIQ — AI Sports Injury & Performance Analysis" },
      { property: "og:description", content: "Upload a sports clip. Get instant AI injury risk, posture score, joint heatmaps, risky-moment timeline, and side-by-side comparisons." },
    ],
  }),
  component: Index,
});

const SPORTS = ["General / Auto-detect", "Running / Sprinting", "Cricket – Batting", "Cricket – Bowling", "Football / Soccer", "Basketball", "Tennis", "Weightlifting"];

type Granularity = "low" | "medium" | "high";
const GRANULARITY: Record<Granularity, { count: number; label: string; sub: string }> = {
  low: { count: 6, label: "Quick", sub: "6 frames · fastest" },
  medium: { count: 10, label: "Standard", sub: "10 frames · balanced" },
  high: { count: 16, label: "Deep", sub: "16 frames · slowest" },
};
const MAX_FRAME_WIDTH = 720;

type ExtractedFrame = { dataUrl: string; timeSec: number };

function Index() {
  const analyze = useServerFn(analyzePose);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [sport, setSport] = useState(SPORTS[0]);
  const [notes, setNotes] = useState("");
  const [granularity, setGranularity] = useState<Granularity>("medium");
  const [frames, setFrames] = useState<ExtractedFrame[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const [history, setHistory] = useState<SavedAnalysis[]>([]);
  const [compareWith, setCompareWith] = useState<SavedAnalysis | null>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const mutation = useMutation({
    mutationFn: async (payload: {
      sport: string;
      notes: string;
      durationSec: number;
      frames: ExtractedFrame[];
    }) => (await analyze({ data: payload })) as AnalysisResult,
    onSuccess: async (data) => {
      setResult(data);
      toast.success("Analysis complete");
      // Auto-save to history
      try {
        const thumb = frames[0] ? await shrinkDataUrl(frames[0].dataUrl) : "";
        const entry: SavedAnalysis = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          label: file?.name?.replace(/\.[^.]+$/, "") || "Untitled clip",
          sport,
          fileName: file?.name ?? "clip",
          createdAt: Date.now(),
          thumbnail: thumb,
          durationSec: duration,
          frameTimes: frames.map((f) => f.timeSec),
          result: data,
        };
        setHistory(saveAnalysis(entry));
      } catch (e) {
        console.warn("history save failed", e);
      }
      setTimeout(() => document.getElementById("report")?.scrollIntoView({ behavior: "smooth" }), 50);
    },
    onError: (e: Error) => toast.error(e.message || "Analysis failed"),
  });

  const onPickFile = (f: File | null) => {
    if (!f) return;
    if (!/\.(mp4|mov|avi|webm|m4v)$/i.test(f.name) && !f.type.startsWith("video/")) {
      toast.error("Please upload an MP4, MOV, AVI, or WebM video");
      return;
    }
    if (f.size > 80 * 1024 * 1024) {
      toast.error("Video must be under 80 MB");
      return;
    }
    setFile(f);
    setFrames([]);
    setResult(null);
    setDuration(0);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(URL.createObjectURL(f));
  };

  const extractFrames = useCallback(async (): Promise<ExtractedFrame[]> => {
    const video = videoRef.current;
    if (!video || !file) return [];
    setExtracting(true);
    try {
      if (video.readyState < 1) {
        await new Promise<void>((resolve) => {
          video.onloadedmetadata = () => resolve();
        });
      }
      const dur = video.duration || 0;
      if (!isFinite(dur) || dur <= 0) throw new Error("Could not read video duration");
      setDuration(dur);

      const count = GRANULARITY[granularity].count;
      const timestamps = Array.from({ length: count }, (_, i) =>
        Math.max(0.05, ((i + 1) / (count + 1)) * dur),
      );

      const w = Math.min(video.videoWidth || MAX_FRAME_WIDTH, MAX_FRAME_WIDTH);
      const ratio = (video.videoHeight || 1) / (video.videoWidth || 1);
      const h = Math.round(w * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;

      const captured: ExtractedFrame[] = [];
      for (const t of timestamps) {
        await new Promise<void>((resolve) => {
          const onSeeked = () => {
            video.removeEventListener("seeked", onSeeked);
            resolve();
          };
          video.addEventListener("seeked", onSeeked);
          video.currentTime = t;
          setTimeout(() => resolve(), 5000);
        });
        ctx.drawImage(video, 0, 0, w, h);
        captured.push({ dataUrl: canvas.toDataURL("image/jpeg", 0.7), timeSec: t });
      }
      setFrames(captured);
      toast.success(`Extracted ${captured.length} keyframes`);
      return captured;
    } catch (e) {
      console.error(e);
      toast.error("Frame extraction failed");
      return [];
    } finally {
      setExtracting(false);
    }
  }, [file, granularity]);

  const onAnalyze = async () => {
    let f = frames;
    let dur = duration;
    if (f.length === 0) {
      f = await extractFrames();
      dur = videoRef.current?.duration ?? dur;
    }
    if (!f.length) {
      toast.error("Extract keyframes first");
      return;
    }
    mutation.mutate({ sport, notes, durationSec: dur || 1, frames: f });
  };

  const seekTo = useCallback((time: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(time, v.duration || time));
    v.play().catch(() => {});
    v.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster theme="dark" richColors position="top-right" />
      <Header />
      <main className="mx-auto max-w-6xl px-4 pb-24">
        <Hero />

        <section className="mt-10 grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" /> 1. Upload your clip
            </h2>
            <p className="text-sm text-muted-foreground mt-1">MP4, MOV, AVI, or WebM. 5–30 seconds works best.</p>

            <label
              htmlFor="video-input"
              className={cn(
                "mt-4 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-background/50 px-6 py-10 text-center cursor-pointer transition hover:border-primary/60 hover:bg-background",
                file && "border-primary/40",
              )}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onPickFile(e.dataTransfer.files?.[0] ?? null);
              }}
            >
              <FileVideo className="w-10 h-10 text-primary" />
              <div>
                <p className="font-medium">{file ? file.name : "Drop a video here, or click to choose"}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : "Max 80 MB"}
                </p>
              </div>
              <input
                id="video-input"
                type="file"
                accept="video/mp4,video/quicktime,video/x-msvideo,video/webm,.mp4,.mov,.avi,.webm"
                className="hidden"
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              />
            </label>

            {videoUrl && (
              <div className="mt-4 rounded-xl overflow-hidden border border-border bg-black">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  preload="metadata"
                  playsInline
                  crossOrigin="anonymous"
                  onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
                  className="w-full max-h-[360px] bg-black"
                />
              </div>
            )}

            {frames.length > 0 && (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  Extracted keyframes · {frames.length}
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {frames.map((f, i) => (
                    <button
                      key={i}
                      onClick={() => seekTo(f.timeSec)}
                      className="relative group rounded-md overflow-hidden border border-border hover:border-primary/60"
                      title={`Seek to ${f.timeSec.toFixed(2)}s`}
                    >
                      <img src={f.dataUrl} alt={`frame ${i}`} className="w-full h-auto block" />
                      <span className="absolute bottom-1 left-1 text-[10px] font-mono px-1 rounded bg-black/70 text-white">
                        {f.timeSec.toFixed(1)}s
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> 2. Settings & analyze
            </h2>

            <label className="block mt-4 text-sm font-medium">Sport / Movement</label>
            <select
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {SPORTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <label className="block mt-4 text-sm font-medium">Analysis granularity</label>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {(Object.keys(GRANULARITY) as Granularity[]).map((g) => (
                <button
                  key={g}
                  onClick={() => { setGranularity(g); setFrames([]); }}
                  className={cn(
                    "rounded-md border px-2 py-2 text-left transition",
                    granularity === g
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background hover:bg-secondary",
                  )}
                >
                  <p className="text-sm font-semibold">{GRANULARITY[g].label}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{GRANULARITY[g].sub}</p>
                </button>
              ))}
            </div>

            <label className="block mt-4 text-sm font-medium">Coach notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. recurring right-knee pain after sprints"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />

            <div className="mt-4 flex flex-col gap-2">
              <button
                disabled={!file || extracting}
                onClick={() => extractFrames()}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50"
              >
                {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Extract {GRANULARITY[granularity].count} keyframes
              </button>
              <button
                disabled={!file || mutation.isPending || extracting}
                onClick={onAnalyze}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 glow-primary"
              >
                {mutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing with AI…</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Run AI analysis</>
                )}
              </button>
              <p className="text-xs text-muted-foreground text-center">
                Powered by KinetIQ Biomechanics AI
              </p>
            </div>
          </div>
        </section>

        <HistoryPanel
          history={history}
          compareWith={compareWith}
          onCompare={(h) => {
            setCompareWith((cur) => (cur?.id === h.id ? null : h));
            toast.message(compareWith?.id === h.id ? "Comparison cleared" : `Comparing with: ${h.label}`);
          }}
          onDelete={(id) => {
            setHistory(deleteAnalysis(id));
            if (compareWith?.id === id) setCompareWith(null);
          }}
        />

        {mutation.isPending && <AnalyzingSkeleton />}
        {result && (
          <Report
            result={result}
            sport={sport}
            fileName={file?.name ?? "clip"}
            duration={duration}
            frames={frames}
            onSeek={seekTo}
            compareWith={compareWith}
          />
        )}
        {!result && !mutation.isPending && <HowItWorks />}
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setEmail(s?.user.email ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <Activity className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">KinetIQ</span>
          <span className="ml-2 text-[10px] uppercase tracking-widest text-primary font-mono">AI Coach</span>
        </div>
        <nav className="flex items-center gap-4 text-sm text-muted-foreground">
          <a href="#how" className="hidden sm:inline hover:text-foreground">How it works</a>
          {email ? (
            <RouterLink to="/profile" className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary">
              <span className="max-w-[140px] truncate">{email}</span>
              <span className="text-primary">Profile →</span>
            </RouterLink>
          ) : (
            <RouterLink to="/auth" className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90">
              Sign in
            </RouterLink>
          )}
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative pt-12 sm:pt-16 pb-2 text-center">
      <div className="absolute inset-0 -z-10 grid-bg opacity-30 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        Frame-level pose, heatmaps & risky-moment timeline
      </div>
      <h1 className="mt-5 text-4xl sm:text-6xl font-bold tracking-tight text-balance">
        See the injury <span className="text-primary">before</span> it happens.
      </h1>
      <p className="mt-4 mx-auto max-w-2xl text-muted-foreground text-balance">
        Upload a sports clip. KinetIQ extracts keyframes, scores joint stress, flags risky moments
        on a clickable timeline, and compares against your previous attempts.
      </p>
    </section>
  );
}

function AnalyzingSkeleton() {
  return (
    <section className="mt-10 rounded-2xl border border-border bg-card p-10 text-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
      <p className="mt-4 font-medium">AI coach is reviewing your clip…</p>
      <p className="text-sm text-muted-foreground mt-1">Estimating joint angles, stress, and risky moments.</p>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { i: "01", t: "Upload", d: "MP4, MOV, AVI, WebM up to 80MB.", Icon: Upload },
    { i: "02", t: "Choose granularity", d: "6, 10, or 16 keyframes per clip.", Icon: Play },
    { i: "03", t: "AI vision analysis", d: "Joint stress heatmap + risky moment timeline.", Icon: Sparkles },
    { i: "04", t: "Compare & export", d: "Side-by-side vs past clips. PDF report.", Icon: GitCompareArrows },
  ];
  return (
    <section id="how" className="mt-16">
      <h2 className="text-2xl font-bold">How it works</h2>
      <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {steps.map((s) => (
          <div key={s.i} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-primary">{s.i}</span>
              <s.Icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="mt-4 font-semibold">{s.t}</p>
            <p className="text-sm text-muted-foreground mt-1">{s.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function riskColor(level: string) {
  if (level === "High") return "text-danger bg-danger/10 border-danger/30";
  if (level === "Medium") return "text-warning bg-warning/10 border-warning/30";
  return "text-success bg-success/10 border-success/30";
}
function riskDot(level: string) {
  if (level === "High") return "bg-danger";
  if (level === "Medium") return "bg-warning";
  return "bg-success";
}

function HistoryPanel({
  history,
  compareWith,
  onCompare,
  onDelete,
}: {
  history: SavedAnalysis[];
  compareWith: SavedAnalysis | null;
  onCompare: (h: SavedAnalysis) => void;
  onDelete: (id: string) => void;
}) {
  if (history.length === 0) return null;
  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <History className="w-5 h-5 text-primary" /> Past analyses
        </h2>
        {compareWith && (
          <button
            onClick={() => onCompare(compareWith)}
            className="inline-flex items-center gap-1 text-xs font-mono text-primary hover:underline"
          >
            <X className="w-3 h-3" /> Clear comparison
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Click a clip to {compareWith ? "swap the" : "set as a"} side-by-side comparison baseline.
      </p>
      <div className="mt-4 flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {history.map((h) => {
          const active = compareWith?.id === h.id;
          return (
            <div
              key={h.id}
              className={cn(
                "relative shrink-0 w-44 rounded-xl border bg-background overflow-hidden transition",
                active ? "border-primary glow-primary" : "border-border hover:border-primary/50",
              )}
            >
              <button onClick={() => onCompare(h)} className="block w-full text-left">
                <div className="aspect-video bg-black flex items-center justify-center">
                  {h.thumbnail ? (
                    <img src={h.thumbnail} alt={h.label} className="w-full h-full object-cover" />
                  ) : (
                    <FileVideo className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-semibold truncate">{h.label}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded border", riskColor(h.result.overallRiskLevel))}>
                      {h.result.overallRiskPercent}%
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      P {h.result.postureScore}
                    </span>
                  </div>
                </div>
              </button>
              <button
                onClick={() => onDelete(h.id)}
                className="absolute top-1 right-1 rounded bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100 hover:bg-danger transition"
                aria-label="Delete"
                title="Delete"
                style={{ opacity: 1 }}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- Heatmap ---------- */

function stressColor(s: number): string {
  // green (120) -> yellow (60) -> red (0)
  const hue = Math.max(0, 120 - s * 120);
  return `hsl(${hue}, 90%, 50%)`;
}

function HeatmapFrame({
  frameUrl,
  joints,
  time,
  onClick,
}: {
  frameUrl: string;
  joints: AnalysisJoint[];
  time: number;
  onClick?: () => void;
}) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const draw = useCallback(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    const rect = img.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);

    // joint heat blobs
    const radius = Math.max(w, h) * 0.11;
    ctx.globalCompositeOperation = "lighter";
    for (const j of joints) {
      const x = j.x * w;
      const y = j.y * h;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      const c = stressColor(j.stress);
      grad.addColorStop(0, c.replace(")", `, ${0.55 + 0.4 * j.stress})`).replace("hsl", "hsla"));
      grad.addColorStop(1, c.replace(")", ", 0)").replace("hsl", "hsla"));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
    // joint dots
    for (const j of joints) {
      const x = j.x * w;
      const y = j.y * h;
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "white";
      ctx.fill();
      ctx.strokeStyle = stressColor(j.stress);
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [joints]);

  useLayoutEffect(() => {
    draw();
    const onResize = () => draw();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [draw]);

  const maxStress = joints.reduce((m, j) => Math.max(m, j.stress), 0);

  return (
    <button
      onClick={onClick}
      className="relative block w-full rounded-lg overflow-hidden border border-border bg-black group"
      title={`Seek to ${time.toFixed(2)}s`}
    >
      <img
        ref={imgRef}
        src={frameUrl}
        onLoad={draw}
        alt=""
        className="w-full h-auto block"
      />
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 w-full h-full" />
      <span className="absolute bottom-1 left-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/70 text-white">
        {time.toFixed(2)}s
      </span>
      <span
        className="absolute top-1 right-1 text-[10px] font-mono px-1.5 py-0.5 rounded text-black font-semibold"
        style={{ background: stressColor(maxStress) }}
      >
        max {Math.round(maxStress * 100)}
      </span>
    </button>
  );
}

/* ---------- Risky moments timeline ---------- */

function RiskyTimeline({
  duration,
  moments,
  frameTimes,
  onSeek,
}: {
  duration: number;
  moments: AnalysisResult["riskyMoments"];
  frameTimes: number[];
  onSeek: (t: number) => void;
}) {
  if (!duration || duration <= 0) return null;
  const ticks = useMemo(() => {
    const step = duration <= 6 ? 1 : duration <= 20 ? 2 : 5;
    const arr: number[] = [];
    for (let t = 0; t <= duration; t += step) arr.push(t);
    return arr;
  }, [duration]);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-semibold flex items-center gap-2">
        <Clock className="w-4 h-4 text-primary" /> Risky moments timeline
      </h3>
      <p className="text-xs text-muted-foreground mt-1">
        Click any marker to jump the video to that moment.
      </p>

      <div className="mt-5 relative h-24">
        {/* track */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 rounded-full bg-secondary overflow-hidden">
          <div className="h-full w-full bg-gradient-to-r from-success/30 via-warning/30 to-danger/30" />
        </div>

        {/* keyframe ticks */}
        {frameTimes.map((t, i) => (
          <button
            key={`kf-${i}`}
            onClick={() => onSeek(t)}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-4 rounded-sm bg-muted-foreground/60 hover:bg-foreground"
            style={{ left: `${(t / duration) * 100}%` }}
            title={`Keyframe @ ${t.toFixed(2)}s`}
          />
        ))}

        {/* risky markers */}
        {moments.map((m, i) => {
          const left = `${Math.min(100, Math.max(0, (m.timeSec / duration) * 100))}%`;
          return (
            <button
              key={i}
              onClick={() => onSeek(m.timeSec)}
              className="group absolute top-0 -translate-x-1/2 flex flex-col items-center"
              style={{ left }}
              title={`${m.label} @ ${m.timeSec.toFixed(2)}s`}
            >
              <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded border bg-card", riskColor(m.severity))}>
                {m.timeSec.toFixed(1)}s
              </span>
              <span className="w-px h-6 bg-border" />
              <span className={cn("w-3.5 h-3.5 rounded-full ring-2 ring-background", riskDot(m.severity))} />
            </button>
          );
        })}

        {/* axis */}
        <div className="absolute left-0 right-0 bottom-0 h-4">
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute -translate-x-1/2 text-[10px] font-mono text-muted-foreground"
              style={{ left: `${(t / duration) * 100}%` }}
            >
              {t}s
            </span>
          ))}
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {moments.map((m, i) => (
          <li key={i} className="rounded-lg border border-border bg-background/60 p-3 flex items-start gap-3">
            <button
              onClick={() => onSeek(m.timeSec)}
              className={cn("shrink-0 mt-0.5 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-mono hover:bg-secondary", riskColor(m.severity))}
            >
              <Play className="w-3 h-3" /> {m.timeSec.toFixed(2)}s
            </button>
            <div className="min-w-0">
              <p className="text-sm font-medium">{m.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{m.explanation}</p>
            </div>
          </li>
        ))}
        {moments.length === 0 && <li className="text-sm text-muted-foreground">No risky moments flagged.</li>}
      </ul>
    </div>
  );
}

/* ---------- Comparison ---------- */

function Comparison({
  current,
  baseline,
}: {
  current: AnalysisResult;
  baseline: SavedAnalysis;
}) {
  const radarData = useMemo(
    () => [
      { axis: "Stability", current: current.scores.movementStability, baseline: baseline.result.scores.movementStability },
      { axis: "Alignment", current: current.scores.jointAlignment, baseline: baseline.result.scores.jointAlignment },
      { axis: "Landing", current: current.scores.landingTechnique, baseline: baseline.result.scores.landingTechnique },
      { axis: "Balance", current: current.scores.balance, baseline: baseline.result.scores.balance },
      { axis: "Fatigue", current: current.scores.fatigueIndicator, baseline: baseline.result.scores.fatigueIndicator },
    ],
    [current, baseline],
  );

  const rows: { label: string; cur: number; base: number; better: "higher" | "lower" }[] = [
    { label: "Overall risk", cur: current.overallRiskPercent, base: baseline.result.overallRiskPercent, better: "lower" },
    { label: "Posture", cur: current.postureScore, base: baseline.result.postureScore, better: "higher" },
    { label: "Performance", cur: current.performanceScore, base: baseline.result.performanceScore, better: "higher" },
    { label: "Stability", cur: current.scores.movementStability, base: baseline.result.scores.movementStability, better: "higher" },
    { label: "Alignment", cur: current.scores.jointAlignment, base: baseline.result.scores.jointAlignment, better: "higher" },
    { label: "Landing", cur: current.scores.landingTechnique, base: baseline.result.scores.landingTechnique, better: "higher" },
    { label: "Balance", cur: current.scores.balance, base: baseline.result.scores.balance, better: "higher" },
  ];

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
      <h3 className="font-semibold flex items-center gap-2 text-primary">
        <GitCompareArrows className="w-4 h-4" /> Side-by-side: Current vs “{baseline.label}”
      </h3>
      <div className="mt-4 grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-3 h-72">
          <ResponsiveContainer>
            <RadarChart data={radarData}>
              <PolarGrid stroke="oklch(0.4 0.02 160)" />
              <PolarAngleAxis dataKey="axis" tick={{ fill: "oklch(0.85 0.01 120)", fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "oklch(0.6 0.02 150)", fontSize: 10 }} />
              <Radar name="Current" dataKey="current" stroke="oklch(0.86 0.21 130)" fill="oklch(0.86 0.21 130)" fillOpacity={0.35} />
              <Radar name="Baseline" dataKey="baseline" stroke="oklch(0.7 0.18 200)" fill="oklch(0.7 0.18 200)" fillOpacity={0.25} />
              <RechartsLegend wrapperStyle={{ fontSize: 11 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="lg:col-span-3 rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Metric</th>
                <th className="text-right px-3 py-2">Current</th>
                <th className="text-right px-3 py-2">Baseline</th>
                <th className="text-right px-3 py-2">Δ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const delta = r.cur - r.base;
                const improved = r.better === "higher" ? delta > 0 : delta < 0;
                const same = delta === 0;
                return (
                  <tr key={r.label} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{r.label}</td>
                    <td className="px-3 py-2 text-right font-mono">{r.cur}</td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">{r.base}</td>
                    <td className={cn(
                      "px-3 py-2 text-right font-mono",
                      same ? "text-muted-foreground" : improved ? "text-success" : "text-danger",
                    )}>
                      {delta > 0 ? "+" : ""}{delta}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------- Main Report ---------- */

function Report({
  result,
  sport,
  fileName,
  duration,
  frames,
  onSeek,
  compareWith,
}: {
  result: AnalysisResult;
  sport: string;
  fileName: string;
  duration: number;
  frames: ExtractedFrame[];
  onSeek: (t: number) => void;
  compareWith: SavedAnalysis | null;
}) {
  const radarData = useMemo(
    () => [
      { axis: "Stability", value: result.scores.movementStability },
      { axis: "Alignment", value: result.scores.jointAlignment },
      { axis: "Landing", value: result.scores.landingTechnique },
      { axis: "Balance", value: result.scores.balance },
      { axis: "Fatigue", value: result.scores.fatigueIndicator },
    ],
    [result],
  );

  // Map frame stress entries back to extracted frames by nearest timestamp
  const heatmapFrames = useMemo(() => {
    return result.frameStress
      .map((fs) => {
        const idx = clamp(fs.frameIndex, 0, frames.length - 1);
        const f = frames[idx];
        if (!f) return null;
        return { ...fs, dataUrl: f.dataUrl, time: f.timeSec };
      })
      .filter(Boolean) as Array<typeof result.frameStress[number] & { dataUrl: string; time: number }>;
  }, [result, frames]);

  const exportPdf = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 40;
    let y = margin;
    const W = doc.internal.pageSize.getWidth();
    const wrap = (text: string, size = 11, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(text, W - margin * 2);
      lines.forEach((ln: string) => {
        if (y > 780) { doc.addPage(); y = margin; }
        doc.text(ln, margin, y);
        y += size + 4;
      });
    };
    const hr = () => { y += 6; doc.setDrawColor(200); doc.line(margin, y, W - margin, y); y += 12; };

    wrap("KinetIQ — AI Sports Analysis Report", 20, true);
    wrap(`Sport: ${sport}   ·   File: ${fileName}   ·   ${new Date().toLocaleString()}`, 9);
    hr();
    wrap(`Overall injury risk: ${result.overallRiskLevel} (${result.overallRiskPercent}%)`, 14, true);
    wrap(`Posture: ${result.postureScore}/100   Performance: ${result.performanceScore}/100`, 11);
    y += 6;
    wrap("Movement summary", 13, true);
    wrap(result.movementSummary);
    hr();
    wrap("Sub-scores", 13, true);
    Object.entries(result.scores).forEach(([k, v]) => wrap(`• ${k}: ${v}/100`));
    hr();
    wrap("Risky moments timeline", 13, true);
    result.riskyMoments.forEach((m) =>
      wrap(`• ${m.timeSec.toFixed(2)}s — [${m.severity}] ${m.label}: ${m.explanation}`),
    );
    hr();
    wrap("Injury risks", 13, true);
    result.injuryRisks.forEach((r) => {
      wrap(`${r.bodyPart} — ${r.injury} [${r.level} · ${r.probabilityPercent}%]`, 11, true);
      wrap(`Why: ${r.reason}`);
      wrap(`Fix: ${r.correction}`);
      y += 4;
    });
    hr();
    wrap("Technique findings", 13, true);
    result.techniqueFindings.forEach((f) => {
      wrap(`${f.area}`, 11, true);
      wrap(`${f.observation}`);
      wrap(`→ ${f.suggestion}`);
    });
    hr();
    wrap("Improvement suggestions", 13, true);
    result.improvementSuggestions.forEach((s) => wrap(`• ${s}`));
    hr();
    wrap("Prevention exercises", 13, true);
    result.preventionExercises.forEach((e) => wrap(`• ${e.name} — ${e.targets} (${e.sets})`));
    hr();
    wrap("Coach notes", 13, true);
    wrap(result.coachNotes);
    doc.save(`KinetIQ-report-${Date.now()}.pdf`);
  };

  return (
    <section id="report" className="mt-12 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs uppercase font-mono tracking-widest text-primary">Analysis report</p>
          <h2 className="text-3xl font-bold mt-1">{result.sportDetected}</h2>
          <p className="text-muted-foreground mt-1 max-w-2xl">{result.movementSummary}</p>
        </div>
        <button
          onClick={exportPdf}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <Download className="w-4 h-4" /> Download PDF
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ScoreCard
          label="Overall injury risk"
          value={`${result.overallRiskPercent}%`}
          sub={result.overallRiskLevel}
          tone={result.overallRiskLevel === "High" ? "danger" : result.overallRiskLevel === "Medium" ? "warning" : "success"}
          Icon={ShieldAlert}
        />
        <ScoreCard label="Posture score" value={`${result.postureScore}`} sub="/ 100" tone="primary" Icon={Activity} />
        <ScoreCard label="Performance score" value={`${result.performanceScore}`} sub="/ 100" tone="accent" Icon={TrendingUp} />
      </div>

      {compareWith && <Comparison current={result} baseline={compareWith} />}

      <RiskyTimeline
        duration={duration}
        moments={result.riskyMoments}
        frameTimes={frames.map((f) => f.timeSec)}
        onSeek={onSeek}
      />

      {heatmapFrames.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-semibold flex items-center gap-2">
              <Flame className="w-4 h-4 text-danger" /> Joint stress heatmap
            </h3>
            <Legend />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Red glow = high mechanical stress on that joint. Click a frame to jump the video to that moment.
          </p>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {heatmapFrames.map((hf, i) => (
              <HeatmapFrame
                key={i}
                frameUrl={hf.dataUrl}
                joints={hf.joints}
                time={hf.time}
                onClick={() => onSeek(hf.time)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold">Biomechanics breakdown</h3>
          <div className="h-72 mt-2">
            <ResponsiveContainer>
              <RadarChart data={radarData}>
                <PolarGrid stroke="oklch(0.4 0.02 160)" />
                <PolarAngleAxis dataKey="axis" tick={{ fill: "oklch(0.85 0.01 120)", fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "oklch(0.6 0.02 150)", fontSize: 10 }} />
                <Radar dataKey="value" stroke="oklch(0.86 0.21 130)" fill="oklch(0.86 0.21 130)" fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-3 rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" /> Injury risks
          </h3>
          <ul className="mt-3 space-y-3">
            {result.injuryRisks.map((r, i) => (
              <li key={i} className="rounded-xl border border-border bg-background/60 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{r.bodyPart}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-sm">{r.injury}</span>
                  <span className={cn("ml-auto text-xs px-2 py-0.5 rounded-full border font-mono", riskColor(r.level))}>
                    {r.level} · {r.probabilityPercent}%
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-2"><span className="text-foreground/80 font-medium">Why:</span> {r.reason}</p>
                <p className="text-sm text-muted-foreground mt-1"><span className="text-primary font-medium">Fix:</span> {r.correction}</p>
              </li>
            ))}
            {result.injuryRisks.length === 0 && (
              <li className="text-sm text-muted-foreground">No significant injury risks detected.</li>
            )}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold">Technique findings</h3>
          <ul className="mt-3 space-y-3">
            {result.techniqueFindings.map((f, i) => (
              <li key={i} className="rounded-lg border border-border bg-background/60 p-3">
                <p className="font-medium text-sm">{f.area}</p>
                <p className="text-sm text-muted-foreground mt-1">{f.observation}</p>
                <p className="text-sm text-primary mt-1">→ {f.suggestion}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold">Prevention exercises</h3>
          <ul className="mt-3 grid sm:grid-cols-2 gap-2">
            {result.preventionExercises.map((e, i) => (
              <li key={i} className="rounded-lg border border-border bg-background/60 p-3">
                <p className="font-medium text-sm">{e.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{e.targets}</p>
                <p className="text-xs font-mono text-primary mt-1">{e.sets}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-semibold">Improvement suggestions</h3>
        <ul className="mt-3 grid sm:grid-cols-2 gap-2 list-disc list-inside text-sm">
          {result.improvementSuggestions.map((s, i) => (
            <li key={i} className="text-muted-foreground"><span className="text-foreground">{s}</span></li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <h3 className="font-semibold flex items-center gap-2 text-primary"><Sparkles className="w-4 h-4" /> AI coach notes</h3>
        <p className="mt-2 text-sm leading-relaxed">{result.coachNotes}</p>
      </div>
    </section>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-2 text-[10px] font-mono">
      <span>safe</span>
      <span
        className="h-2 w-32 rounded-full"
        style={{ background: "linear-gradient(to right, hsl(120,90%,50%), hsl(60,90%,50%), hsl(0,90%,50%))" }}
      />
      <span>high stress</span>
    </div>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function ScoreCard({
  label, value, sub, tone, Icon,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "primary" | "accent" | "success" | "warning" | "danger";
  Icon: React.ComponentType<{ className?: string }>;
}) {
  const toneCls = {
    primary: "text-primary",
    accent: "text-accent",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
  }[tone];
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className={cn("w-4 h-4", toneCls)} />
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className={cn("text-4xl font-bold font-display", toneCls)}>{value}</span>
        <span className="text-sm text-muted-foreground">{sub}</span>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border mt-16">
      <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground flex justify-between">
        <span>© KinetIQ · AI sports analysis</span>
        <span className="font-mono">Not medical advice</span>
      </div>
    </footer>
  );
}
