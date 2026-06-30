import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Download,
  FileVideo,
  Loader2,
  Play,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Upload,
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import jsPDF from "jspdf";
import { toast, Toaster } from "sonner";
import { analyzePose, type AnalysisResult } from "@/lib/analyze.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KinetIQ — AI Sports Injury & Performance Analysis" },
      { name: "description", content: "Upload a sports clip. Get instant AI injury risk, posture score, and corrective coaching from frame-level pose analysis." },
      { property: "og:title", content: "KinetIQ — AI Sports Injury & Performance Analysis" },
      { property: "og:description", content: "Upload a sports clip. Get instant AI injury risk, posture score, and corrective coaching from frame-level pose analysis." },
    ],
  }),
  component: Index,
});

const SPORTS = ["General / Auto-detect", "Running / Sprinting", "Cricket – Batting", "Cricket – Bowling", "Football / Soccer", "Basketball", "Tennis", "Weightlifting"];
const FRAME_COUNT = 6;
const MAX_FRAME_WIDTH = 720;

function Index() {
  const analyze = useServerFn(analyzePose);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [sport, setSport] = useState(SPORTS[0]);
  const [notes, setNotes] = useState("");
  const [frames, setFrames] = useState<string[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const mutation = useMutation({
    mutationFn: async (payload: { sport: string; notes: string; frames: string[] }) =>
      (await analyze({ data: payload })) as AnalysisResult,
    onSuccess: (data) => {
      setResult(data);
      toast.success("Analysis complete");
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
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(URL.createObjectURL(f));
  };

  const extractFrames = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !file) return;
    setExtracting(true);
    try {
      if (video.readyState < 1) {
        await new Promise<void>((resolve) => {
          video.onloadedmetadata = () => resolve();
        });
      }
      const duration = video.duration || 0;
      if (!isFinite(duration) || duration <= 0) throw new Error("Could not read video duration");

      const timestamps = Array.from({ length: FRAME_COUNT }, (_, i) =>
        Math.max(0.1, ((i + 1) / (FRAME_COUNT + 1)) * duration),
      );

      const w = Math.min(video.videoWidth || MAX_FRAME_WIDTH, MAX_FRAME_WIDTH);
      const ratio = (video.videoHeight || 1) / (video.videoWidth || 1);
      const h = Math.round(w * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;

      const captured: string[] = [];
      for (const t of timestamps) {
        await new Promise<void>((resolve, reject) => {
          const onSeeked = () => {
            video.removeEventListener("seeked", onSeeked);
            resolve();
          };
          video.addEventListener("seeked", onSeeked);
          video.currentTime = t;
          setTimeout(() => reject(new Error("seek timeout")), 5000);
        }).catch(() => {});
        ctx.drawImage(video, 0, 0, w, h);
        captured.push(canvas.toDataURL("image/jpeg", 0.75));
      }
      setFrames(captured);
      toast.success(`Extracted ${captured.length} keyframes`);
    } catch (e) {
      console.error(e);
      toast.error("Frame extraction failed");
    } finally {
      setExtracting(false);
    }
  }, [file]);

  const onAnalyze = async () => {
    let f = frames;
    if (f.length === 0) {
      await extractFrames();
      // re-read state on next tick
      await new Promise((r) => setTimeout(r, 50));
      f = framesRef.current;
    }
    const usable = f.length ? f : framesRef.current;
    if (!usable.length) {
      toast.error("Extract keyframes first");
      return;
    }
    mutation.mutate({ sport, notes, frames: usable });
  };

  // keep a ref of latest frames so onAnalyze post-extract works
  const framesRef = useRef<string[]>([]);
  framesRef.current = frames;

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
                  className="w-full max-h-[360px] bg-black"
                />
              </div>
            )}

            {frames.length > 0 && (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Extracted keyframes</p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {frames.map((src, i) => (
                    <img key={i} src={src} alt={`frame ${i}`} className="rounded-md border border-border w-full h-auto" />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> 2. Context & analyze
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

            <label className="block mt-4 text-sm font-medium">Coach notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="e.g. recurring right-knee pain after sprints"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />

            <div className="mt-5 flex flex-col gap-2">
              <button
                disabled={!file || extracting}
                onClick={extractFrames}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50"
              >
                {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Extract {FRAME_COUNT} keyframes
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
                Powered by Lovable AI Vision · No data stored
              </p>
            </div>
          </div>
        </section>

        {mutation.isPending && <AnalyzingSkeleton />}
        {result && <Report result={result} sport={sport} fileName={file?.name ?? "clip"} />}
        {!result && !mutation.isPending && <HowItWorks />}
      </main>
      <Footer />
    </div>
  );
}

function Header() {
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
        <nav className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#how" className="hover:text-foreground">How it works</a>
          <a href="https://docs.lovable.dev" target="_blank" rel="noreferrer" className="hover:text-foreground">Docs</a>
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
        Frame-level pose & risk analysis
      </div>
      <h1 className="mt-5 text-4xl sm:text-6xl font-bold tracking-tight text-balance">
        See the injury <span className="text-primary">before</span> it happens.
      </h1>
      <p className="mt-4 mx-auto max-w-2xl text-muted-foreground text-balance">
        Upload a sports clip. KinetIQ extracts keyframes, analyzes athlete pose with AI vision,
        and returns an injury-risk score, technique breakdown, and corrective drills — in seconds.
      </p>
    </section>
  );
}

function AnalyzingSkeleton() {
  return (
    <section className="mt-10 rounded-2xl border border-border bg-card p-10 text-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
      <p className="mt-4 font-medium">AI coach is reviewing your clip…</p>
      <p className="text-sm text-muted-foreground mt-1">Estimating joint angles, balance, and landing mechanics.</p>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { i: "01", t: "Upload", d: "MP4, MOV, AVI, WebM up to 80MB.", Icon: Upload },
    { i: "02", t: "Pose extraction", d: "We sample keyframes from the clip in-browser.", Icon: Play },
    { i: "03", t: "AI analysis", d: "Vision model scores joint alignment, balance, landing.", Icon: Sparkles },
    { i: "04", t: "Report", d: "Risk score, findings, drills — export as PDF.", Icon: Download },
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

function Report({ result, sport, fileName }: { result: AnalysisResult; sport: string; fileName: string }) {
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
    wrap(`Posture score: ${result.postureScore}/100   Performance score: ${result.performanceScore}/100`, 11);
    y += 6;
    wrap("Movement summary", 13, true);
    wrap(result.movementSummary);
    hr();
    wrap("Sub-scores", 13, true);
    Object.entries(result.scores).forEach(([k, v]) => wrap(`• ${k}: ${v}/100`));
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
          <h3 className="font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-warning" /> Injury risks</h3>
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
