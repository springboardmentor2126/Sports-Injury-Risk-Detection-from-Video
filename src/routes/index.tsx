import { createFileRoute, Link as RouterLink } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  Send,
  MessageSquare,
  Scale,
  Zap,
  Apple,
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend as RechartsLegend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";
import jsPDF from "jspdf";
import { toast, Toaster } from "sonner";
import { analyzePose, chatWithCoach, type AnalysisJoint, type AnalysisResult } from "@/lib/analyze.functions";
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
      {
        name: "description",
        content:
          "Upload a sports clip. Get instant AI injury risk, posture score, joint heatmaps, risky-moment timeline, and side-by-side comparisons.",
      },
      { property: "og:title", content: "KinetIQ — AI Sports Injury & Performance Analysis" },
      {
        property: "og:description",
        content:
          "Upload a sports clip. Get instant AI injury risk, posture score, joint heatmaps, risky-moment timeline, and side-by-side comparisons.",
      },
    ],
  }),
  component: Index,
});

const SPORTS = [
  "General / Auto-detect",
  "Running / Sprinting",
  "Cricket – Batting",
  "Cricket – Bowling",
  "Football / Soccer",
  "Basketball",
  "Tennis",
  "Weightlifting",
];

const SKELETON_CONNECTIONS = [
  ["head", "neck"],
  ["neck", "leftShoulder"],
  ["neck", "rightShoulder"],
  ["leftShoulder", "leftElbow"],
  ["leftElbow", "leftWrist"],
  ["rightShoulder", "rightElbow"],
  ["rightElbow", "rightWrist"],
  ["leftShoulder", "leftHip"],
  ["rightShoulder", "rightHip"],
  ["leftHip", "rightHip"],
  ["leftHip", "leftKnee"],
  ["leftKnee", "leftAnkle"],
  ["rightHip", "rightKnee"],
  ["rightKnee", "rightAnkle"],
];

type Granularity = "low" | "medium" | "high";
const GRANULARITY: Record<Granularity, { count: number; label: string; sub: string }> = {
  low: { count: 6, label: "Quick", sub: "6 frames · fastest" },
  medium: { count: 10, label: "Standard", sub: "10 frames · balanced" },
  high: { count: 16, label: "Deep", sub: "16 frames · slowest" },
};
const MAX_FRAME_WIDTH = 720;

type ExtractedFrame = {
  dataUrl: string;
  timeSec: number;
  joints?: Record<string, { x: number; y: number; confidence: number }>;
};

let poseLandmarkerInstance: any = null;
const getPoseLandmarker = async () => {
  if (poseLandmarkerInstance) return poseLandmarkerInstance;
  const visionModule = await import(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs" as any
  );
  const vision = await visionModule.FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
  );
  poseLandmarkerInstance = await visionModule.PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
      delegate: "GPU",
    },
    runningMode: "IMAGE",
  });
  return poseLandmarkerInstance;
};

const mapMediaPipeToKinetIQ = (landmarks: any[]) => {
  if (!landmarks || landmarks.length === 0) return undefined;
  const getConf = (lm: any) => (lm.visibility !== undefined ? lm.visibility : lm.presence || 1.0);

  const neck = {
    x: (landmarks[11].x + landmarks[12].x) / 2,
    y: (landmarks[11].y + landmarks[12].y) / 2,
    confidence: (getConf(landmarks[11]) + getConf(landmarks[12])) / 2,
  };

  return {
    head: { x: landmarks[0].x, y: landmarks[0].y, confidence: getConf(landmarks[0]) },
    neck: { x: neck.x, y: neck.y, confidence: neck.confidence },
    leftShoulder: { x: landmarks[11].x, y: landmarks[11].y, confidence: getConf(landmarks[11]) },
    rightShoulder: { x: landmarks[12].x, y: landmarks[12].y, confidence: getConf(landmarks[12]) },
    leftElbow: { x: landmarks[13].x, y: landmarks[13].y, confidence: getConf(landmarks[13]) },
    rightElbow: { x: landmarks[14].x, y: landmarks[14].y, confidence: getConf(landmarks[14]) },
    leftWrist: { x: landmarks[15].x, y: landmarks[15].y, confidence: getConf(landmarks[15]) },
    rightWrist: { x: landmarks[16].x, y: landmarks[16].y, confidence: getConf(landmarks[16]) },
    leftHip: { x: landmarks[23].x, y: landmarks[23].y, confidence: getConf(landmarks[23]) },
    rightHip: { x: landmarks[24].x, y: landmarks[24].y, confidence: getConf(landmarks[24]) },
    leftKnee: { x: landmarks[25].x, y: landmarks[25].y, confidence: getConf(landmarks[25]) },
    rightKnee: { x: landmarks[26].x, y: landmarks[26].y, confidence: getConf(landmarks[26]) },
    leftAnkle: { x: landmarks[27].x, y: landmarks[27].y, confidence: getConf(landmarks[27]) },
    rightAnkle: { x: landmarks[28].x, y: landmarks[28].y, confidence: getConf(landmarks[28]) },
  };
};

const calculateAngle = (
  a?: { x: number; y: number },
  b?: { x: number; y: number },
  c?: { x: number; y: number }
): number | null => {
  if (!a || !b || !c) return null;
  const vectorBA = { x: a.x - b.x, y: a.y - b.y };
  const vectorBC = { x: c.x - b.x, y: c.y - b.y };

  const dotProduct = vectorBA.x * vectorBC.x + vectorBA.y * vectorBC.y;
  const magBA = Math.sqrt(vectorBA.x * vectorBA.x + vectorBA.y * vectorBA.y);
  const magBC = Math.sqrt(vectorBC.x * vectorBC.x + vectorBC.y * vectorBC.y);

  if (magBA === 0 || magBC === 0) return null;

  const cosTheta = dotProduct / (magBA * magBC);
  const angleRad = Math.acos(Math.max(-1, Math.min(1, cosTheta)));
  return Math.round((angleRad * 180) / Math.PI);
};

function Index() {
  const analyze = useServerFn(analyzePose);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [sport, setSport] = useState(SPORTS[0]);
  const [notes, setNotes] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("gemini-3.5-flash");
  const [granularity, setGranularity] = useState<Granularity>("medium");
  const [frames, setFrames] = useState<ExtractedFrame[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const [history, setHistory] = useState<SavedAnalysis[]>([]);
  const [compareWith, setCompareWith] = useState<SavedAnalysis | null>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    setHistory(loadHistory());

    // Fetch user profile if logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) setProfile(data);
          });
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();
        if (data) setProfile(data);
      } else {
        setProfile(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const mutation = useMutation({
    mutationFn: async (payload: {
      sport: string;
      notes: string;
      durationSec: number;
      frames: ExtractedFrame[];
      profile?: any;
      pastAnalyses?: any[];
      model?: string;
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
      setTimeout(
        () => document.getElementById("report")?.scrollIntoView({ behavior: "smooth" }),
        50,
      );
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

      // Small canvas for high-performance MediaPipe skeleton tracking
      const smallW = 256;
      const smallH = Math.round(smallW * ratio);
      const smallCanvas = document.createElement("canvas");
      smallCanvas.width = smallW;
      smallCanvas.height = smallH;
      const smallCtx = smallCanvas.getContext("2d")!;

      let landmarker: any = null;
      try {
        landmarker = await getPoseLandmarker();
      } catch (err) {
        console.warn("Failed to initialize MediaPipe Pose. Falling back to pure vision.", err);
      }

      const captured: ExtractedFrame[] = [];
      for (const t of timestamps) {
        await new Promise<void>((resolve) => {
          let timeoutId: any;
          const onSeeked = () => {
            video.removeEventListener("seeked", onSeeked);
            clearTimeout(timeoutId);
            resolve();
          };
          video.addEventListener("seeked", onSeeked);
          video.currentTime = t;
          timeoutId = setTimeout(() => {
            video.removeEventListener("seeked", onSeeked);
            resolve();
          }, 800);
        });

        ctx.drawImage(video, 0, 0, w, h);

        let joints: Record<string, { x: number; y: number; confidence: number }> | undefined =
          undefined;
        if (landmarker) {
          try {
            smallCtx.drawImage(video, 0, 0, smallW, smallH);
            const result = landmarker.detect(smallCanvas);
            if (result && result.landmarks && result.landmarks.length > 0) {
              joints = mapMediaPipeToKinetIQ(result.landmarks[0]);
            }
          } catch (poseErr) {
            console.error("MediaPipe Pose detection failed for frame at time", t, poseErr);
          }
        }

        captured.push({
          dataUrl: canvas.toDataURL("image/jpeg", 0.7),
          timeSec: t,
          joints,
        });
      }
      setFrames(captured);
      toast.success(
        `Extracted ${captured.length} keyframes (Precision skeletal tracking complete)`,
      );
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

    const pastAnalyses = history.slice(0, 5).map((h) => ({
      createdAt: h.createdAt,
      sport: h.sport,
      overallRiskLevel: h.result.overallRiskLevel,
      overallRiskPercent: h.result.overallRiskPercent,
      postureScore: h.result.postureScore,
      performanceScore: h.result.performanceScore,
      movementSummary: h.result.movementSummary,
    }));

    mutation.mutate({
      sport,
      notes,
      durationSec: dur || 1,
      frames: f,
      profile: profile || undefined,
      pastAnalyses: pastAnalyses.length > 0 ? pastAnalyses : undefined,
      model: selectedModel,
    });
  };

  const seekTo = useCallback((time: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(time, v.duration || time));
    v.play().catch(() => {});
    v.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  return (
    <div className="min-h-screen bg-background text-on-surface selection:bg-primary/30 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 -right-24 w-64 h-64 bg-tertiary/5 rounded-full blur-[100px] pointer-events-none" />

      <Toaster theme="dark" richColors position="top-right" />
      <Header />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 relative z-10">
        <Hero />

        <section className="mt-10 grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 rounded-2xl glass-card p-6 shadow-lg hover:border-primary/20 transition-all duration-300">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="bg-primary/20 text-primary w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold">
                1
              </span>
              Upload your clip
            </h2>
            <p className="text-sm text-on-surface-variant mt-1">
              MP4, MOV, AVI, or WebM up to 80MB.
            </p>

            <label
              htmlFor="video-input"
              className={cn(
                "mt-6 flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-outline-variant bg-surface-container-low/30 hover:bg-primary/5 hover:border-primary/50 px-6 py-12 text-center cursor-pointer transition-all duration-300",
                file && "border-primary/40 bg-primary/5",
              )}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onPickFile(e.dataTransfer.files?.[0] ?? null);
              }}
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                <FileVideo className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-on-surface">
                  {file ? file.name : "Drag & drop video file, or browse"}
                </p>
                <p className="text-xs text-on-surface-variant mt-1">
                  {file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : "MP4, MOV, or AVI"}
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
              <div className="mt-6 rounded-xl overflow-hidden border border-primary/15 bg-black/40 shadow-inner">
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
                      {f.joints && (
                        <svg
                          className="absolute inset-0 w-full h-full pointer-events-none"
                          viewBox="0 0 1 1"
                          preserveAspectRatio="none"
                        >
                          {/* Draw connections */}
                          {SKELETON_CONNECTIONS.map(([p1, p2], idx) => {
                            const pt1 = f.joints?.[p1];
                            const pt2 = f.joints?.[p2];
                            if (!pt1 || !pt2 || pt1.confidence < 0.2 || pt2.confidence < 0.2)
                              return null;
                            return (
                              <line
                                key={idx}
                                x1={pt1.x}
                                y1={pt1.y}
                                x2={pt2.x}
                                y2={pt2.y}
                                stroke="rgba(14, 165, 233, 0.85)"
                                strokeWidth="0.015"
                              />
                            );
                          })}
                          {/* Draw joints */}
                          {Object.entries(f.joints).map(([name, pt]) => {
                            if (pt.confidence < 0.2) return null;
                            return (
                              <circle
                                key={name}
                                cx={pt.x}
                                cy={pt.y}
                                r="0.02"
                                fill="#0ea5e9"
                                stroke="white"
                                strokeWidth="0.004"
                              />
                            );
                          })}
                        </svg>
                      )}
                      <span className="absolute bottom-1 left-1 text-[10px] font-mono px-1 rounded bg-black/70 text-white z-10">
                        {f.timeSec.toFixed(1)}s
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 rounded-2xl glass-card p-6 shadow-lg hover:border-primary/20 transition-all duration-300">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="bg-primary/20 text-primary w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold">
                2
              </span>
              Settings & analyze
            </h2>

            <label className="block mt-6 text-sm font-semibold text-on-surface-variant mb-2">
              Sport / Movement Type
            </label>
            <select
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant rounded-lg px-4 py-3 focus:outline-none focus:border-primary/60 transition-colors text-on-surface text-sm appearance-none"
            >
              {SPORTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <label className="block mt-6 text-sm font-semibold text-on-surface-variant mb-2">
              AI Analysis Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant rounded-lg px-4 py-3 focus:outline-none focus:border-primary/60 transition-colors text-on-surface text-sm appearance-none"
            >
              <option value="gemini-3.5-flash">Gemini 3.5 Flash (Fastest / Low cost)</option>
              <option value="gemini-3.5-pro">Gemini 3.5 Pro (Deep reasoning)</option>
              <option value="gemini-3.6-flash">Gemini 3.6 Flash (Fastest / Advanced)</option>
              <option value="gemini-3.6-pro">Gemini 3.6 Pro (Ultra Deep reasoning)</option>
              <option value="llama3.2-vision">Llama 3.2 Vision (Ollama Cloud)</option>
            </select>

            <label className="block mt-6 text-sm font-semibold text-on-surface-variant mb-2">
              Analysis granularity
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(GRANULARITY) as Granularity[]).map((g) => (
                <button
                  key={g}
                  onClick={() => {
                    setGranularity(g);
                    setFrames([]);
                  }}
                  className={cn(
                    "rounded-lg border px-2 py-3 text-left transition-all duration-200 flex flex-col justify-between min-h-[68px]",
                    granularity === g
                      ? "border-primary bg-primary/10 text-primary shadow-[0_0_15px_rgba(125,211,252,0.1)]"
                      : "border-outline-variant bg-surface-container/50 hover:border-primary/40 text-on-surface-variant",
                  )}
                >
                  <p className="text-xs font-bold uppercase tracking-wider">
                    {GRANULARITY[g].label}
                  </p>
                  <p className="text-[9px] font-mono opacity-80 mt-1">{GRANULARITY[g].sub}</p>
                </button>
              ))}
            </div>

            <label className="block mt-6 text-sm font-semibold text-on-surface-variant mb-2">
              Coach notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="e.g. Focus on knee valgus during landing phase..."
              className="w-full bg-surface-container border border-outline-variant rounded-lg px-4 py-3 focus:outline-none focus:border-primary/60 transition-colors text-on-surface placeholder:text-on-surface-variant/40 text-sm resize-none"
            />

            <div className="mt-6 flex flex-col gap-2">
              <button
                disabled={!file || extracting}
                onClick={() => extractFrames()}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline bg-surface-container-highest px-4 py-2.5 text-sm font-medium hover:border-primary/40 hover:text-primary transition-all duration-200 disabled:opacity-50 disabled:hover:text-inherit"
              >
                {extracting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Extract {GRANULARITY[granularity].count} keyframes
              </button>
            </div>
          </div>
        </section>

        {/* Center CTA Button */}
        <div className="mt-12 flex flex-col items-center">
          <button
            disabled={!file || mutation.isPending || extracting}
            onClick={onAnalyze}
            className="group relative px-12 py-5 rounded-full bg-primary text-on-primary font-headline font-bold text-xl transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(125,211,252,0.3)] overflow-hidden disabled:opacity-50 disabled:hover:scale-100"
          >
            <span className="relative z-10 flex items-center gap-3">
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Analyzing with AI…
                </>
              ) : (
                <>
                  Run AI analysis
                  <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </>
              )}
            </span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </button>
          <p className="mt-6 text-on-surface-variant text-sm flex items-center gap-2">
            <span className="text-primary text-xs">ℹ</span>
            Analysis typically takes 15-30 seconds depending on granularity.
          </p>
        </div>

        <HistoryPanel
          history={history}
          compareWith={compareWith}
          onCompare={(h) => {
            setCompareWith((cur) => (cur?.id === h.id ? null : h));
            toast.message(
              compareWith?.id === h.id ? "Comparison cleared" : `Comparing with: ${h.label}`,
            );
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
            profile={profile}
            hasHistory={history.length > 0}
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
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setEmail(s?.user.email ?? null),
    );
    return () => sub.subscription.unsubscribe();
  }, []);
  return (
    <header className="fixed top-0 w-full z-50 bg-surface/60 backdrop-blur-xl border-b border-primary/10 shadow-[0_0_30px_rgba(125,211,252,0.05)]">
      <nav className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
        <RouterLink
          to="/"
          className="text-2xl font-headline font-semibold tracking-tight text-on-surface flex items-center gap-2"
        >
          <Activity className="h-6 w-6 text-primary" />
          <span>KinetIQ</span>
        </RouterLink>
        <div className="hidden md:flex items-center gap-8 font-body text-sm font-medium">
          <a
            className="text-on-surface-variant hover:text-on-surface transition-all duration-300"
            href="#how"
          >
            How It Works
          </a>
          <RouterLink className="text-primary border-b-2 border-primary pb-1" to="/">
            Analysis
          </RouterLink>
        </div>
        <div className="flex items-center gap-4">
          {email ? (
            <RouterLink
              to="/profile"
              className="px-5 py-2 rounded-lg bg-primary/20 border border-primary/30 text-primary font-medium hover:bg-primary/30 transition-all duration-300 active:scale-95 text-sm"
            >
              <span className="max-w-[140px] truncate">{email}</span>
            </RouterLink>
          ) : (
            <>
              <RouterLink
                to="/auth"
                className="px-5 py-2 rounded-lg font-medium text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-all duration-300 active:scale-95 text-sm"
              >
                Login
              </RouterLink>
              <RouterLink
                to="/auth"
                className="px-5 py-2 rounded-lg bg-primary/20 border border-primary/30 text-primary font-medium hover:bg-primary/30 transition-all duration-300 active:scale-95 text-sm"
              >
                Get Started
              </RouterLink>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative pt-12 sm:pt-16 pb-2 text-center">
      <div className="absolute inset-0 -z-10 grid-bg opacity-30 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-6 animate-pulse">
        <span className="w-2 h-2 rounded-full bg-primary" />
        AI PREDICTIVE KINEMATICS ACTIVE
      </div>
      <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-balance">
        See the injury <span className="text-primary italic text-glow">before</span> it happens.
      </h1>
      <p className="mt-4 mx-auto max-w-2xl text-muted-foreground text-balance">
        Upload your performance clips and let KinetIQ’s proprietary AI extract joint angles, torque
        loads, and fatigue markers in seconds. Transform video into clinical-grade biomechanical
        data.
      </p>
    </section>
  );
}

function AnalyzingSkeleton() {
  return (
    <section className="mt-10 rounded-2xl border border-primary/20 bg-primary/5 p-10 text-center backdrop-blur-md">
      <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
      <p className="mt-4 font-medium text-primary">AI coach is reviewing your clip…</p>
      <p className="text-sm text-muted-foreground mt-1">
        Estimating joint angles, stress, and risky moments.
      </p>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      i: "1",
      t: "Upload your clip",
      d: "Drag & drop video file. MP4, MOV, or AVI works best.",
      Icon: Upload,
    },
    {
      i: "2",
      t: "Settings & analyze",
      d: "Choose movement type, granularity, and notes.",
      Icon: Play,
    },
    {
      i: "3",
      t: "AI Vision analysis",
      d: "Extract joint angles, torque load, and risk factors.",
      Icon: Sparkles,
    },
    {
      i: "4",
      t: "Compare & export",
      d: "Compare with previous runs or download PDF.",
      Icon: GitCompareArrows,
    },
  ];
  return (
    <section id="how" className="mt-16">
      <h2 className="text-2xl font-bold mb-6">How it works</h2>
      <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {steps.map((s) => (
          <div
            key={s.i}
            className="rounded-2xl border border-primary/10 bg-surface/40 backdrop-blur-md p-5 transition hover:border-primary/30"
          >
            <div className="flex items-center justify-between">
              <span className="bg-primary/20 text-primary w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold">
                {s.i}
              </span>
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

  const trendData = useMemo(() => {
    return [...history]
      .reverse()
      .map((h) => ({
        date: new Date(h.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        "Posture": h.result.postureScore,
        "Performance": h.result.performanceScore,
        "Symmetry": h.result.symmetryIndex !== undefined ? h.result.symmetryIndex : 90,
        "Injury Risk": h.result.overallRiskPercent,
      }));
  }, [history]);

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
                    <span
                      className={cn(
                        "text-[10px] font-mono px-1.5 py-0.5 rounded border",
                        riskColor(h.result.overallRiskLevel),
                      )}
                    >
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

      {history.length > 1 && (
        <div className="mt-8 pt-6 border-t border-border">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Athlete Progress Trends
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Tracking performance improvement and injury risk reduction across successive analysis sessions.
          </p>
          <div className="h-56 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={10} />
                <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.4)" fontSize={10} />
                <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(20,20,25,0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} labelClassName="text-white text-xs" />
                <RechartsLegend verticalAlign="top" height={32} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="Posture" stroke="oklch(0.65 0.25 260)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Performance" stroke="oklch(0.7 0.2 130)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Symmetry" stroke="oklch(0.6 0.18 190)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Injury Risk" stroke="oklch(0.65 0.25 350)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
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
  showAngles = false,
}: {
  frameUrl: string;
  joints: AnalysisJoint[];
  time: number;
  onClick?: () => void;
  showAngles?: boolean;
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

    // Map joints to coordinate object for easier reference
    const jointsObj = Object.fromEntries(joints.map((j) => [j.name, { x: j.x, y: j.y }]));

    if (showAngles) {
      // draw skeleton lines
      const HEATMAP_CONNECTIONS = [
        ["leftShoulder", "leftElbow"],
        ["leftElbow", "leftWrist"],
        ["rightShoulder", "rightElbow"],
        ["rightElbow", "rightWrist"],
        ["leftShoulder", "leftHip"],
        ["rightShoulder", "rightHip"],
        ["leftHip", "rightHip"],
        ["leftHip", "leftKnee"],
        ["leftKnee", "leftAnkle"],
        ["rightHip", "rightKnee"],
        ["rightKnee", "rightAnkle"],
      ];

      for (const [p1, p2] of HEATMAP_CONNECTIONS) {
        const pt1 = jointsObj[p1];
        const pt2 = jointsObj[p2];
        if (pt1 && pt2) {
          ctx.beginPath();
          ctx.moveTo(pt1.x * w, pt1.y * h);
          ctx.lineTo(pt2.x * w, pt2.y * h);
          ctx.strokeStyle = "rgba(14, 165, 233, 0.4)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
    }

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

    if (showAngles) {
      const angles = [
        { name: "leftKnee", val: calculateAngle(jointsObj.leftHip, jointsObj.leftKnee, jointsObj.leftAnkle) },
        { name: "rightKnee", val: calculateAngle(jointsObj.rightHip, jointsObj.rightKnee, jointsObj.rightAnkle) },
        { name: "leftHip", val: calculateAngle(jointsObj.leftShoulder, jointsObj.leftHip, jointsObj.leftKnee) },
        { name: "rightHip", val: calculateAngle(jointsObj.rightShoulder, jointsObj.rightHip, jointsObj.rightKnee) },
        { name: "leftElbow", val: calculateAngle(jointsObj.leftShoulder, jointsObj.leftElbow, jointsObj.leftWrist) },
        { name: "rightElbow", val: calculateAngle(jointsObj.rightShoulder, jointsObj.rightElbow, jointsObj.rightWrist) },
      ];
      for (const a of angles) {
        if (a.val !== null) {
          const j = jointsObj[a.name];
          if (j) {
            ctx.font = "bold 9px monospace";
            ctx.fillStyle = "#ffffff";
            ctx.shadowColor = "black";
            ctx.shadowBlur = 3;
            ctx.fillText(`${a.val}°`, j.x * w + 5, j.y * h - 2);
            ctx.shadowBlur = 0;
          }
        }
      }
    }
  }, [joints, showAngles]);

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
      <img ref={imgRef} src={frameUrl} onLoad={draw} alt="" className="w-full h-auto block" />
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

function AnnotatedHeatmapFrame({
  frameUrl,
  joints,
  time,
  frameIndex,
  showAngles,
  onSeek,
  note,
  onSaveNote,
}: {
  frameUrl: string;
  joints: AnalysisJoint[];
  time: number;
  frameIndex: number;
  showAngles: boolean;
  onSeek: (t: number) => void;
  note: string;
  onSaveNote: (frameIndex: number, text: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempNote, setTempNote] = useState(note);

  useEffect(() => {
    setTempNote(note);
  }, [note]);

  return (
    <div className="space-y-2">
      <HeatmapFrame
        frameUrl={frameUrl}
        joints={joints}
        time={time}
        showAngles={showAngles}
        onClick={() => onSeek(time)}
      />
      <div className="bg-background/80 rounded-lg p-2 border border-border text-xs">
        {isEditing ? (
          <div className="space-y-1">
            <textarea
              value={tempNote}
              onChange={(e) => setTempNote(e.target.value)}
              placeholder="Add coach feedback..."
              className="w-full h-12 bg-card border border-border rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary text-[10px] resize-none"
            />
            <div className="flex justify-end gap-1">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-[9px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onSaveNote(frameIndex, tempNote);
                  setIsEditing(false);
                }}
                className="px-2 py-0.5 rounded bg-primary text-primary-foreground hover:opacity-90 text-[9px] font-semibold"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div>
            {note ? (
              <p className="italic text-foreground/90 font-mono text-[10px] leading-snug">
                ✍️ Coach: "{note}"
              </p>
            ) : (
              <p className="text-muted-foreground italic text-[9px]">No frame notes</p>
            )}
            <button
              type="button"
              onClick={() => {
                setTempNote(note);
                setIsEditing(true);
              }}
              className="mt-1 text-primary hover:underline text-[9px] block font-medium"
            >
              {note ? "Edit note" : "+ Add coach note"}
            </button>
          </div>
        )}
      </div>
    </div>
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
              <span
                className={cn(
                  "text-[10px] font-mono px-1.5 py-0.5 rounded border bg-card",
                  riskColor(m.severity),
                )}
              >
                {m.timeSec.toFixed(1)}s
              </span>
              <span className="w-px h-6 bg-border" />
              <span
                className={cn(
                  "w-3.5 h-3.5 rounded-full ring-2 ring-background",
                  riskDot(m.severity),
                )}
              />
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
          <li
            key={i}
            className="rounded-lg border border-border bg-background/60 p-3 flex items-start gap-3"
          >
            <button
              onClick={() => onSeek(m.timeSec)}
              className={cn(
                "shrink-0 mt-0.5 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-mono hover:bg-secondary",
                riskColor(m.severity),
              )}
            >
              <Play className="w-3 h-3" /> {m.timeSec.toFixed(2)}s
            </button>
            <div className="min-w-0">
              <p className="text-sm font-medium">{m.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{m.explanation}</p>
            </div>
          </li>
        ))}
        {moments.length === 0 && (
          <li className="text-sm text-muted-foreground">No risky moments flagged.</li>
        )}
      </ul>
    </div>
  );
}

/* ---------- Comparison ---------- */

function Comparison({ current, baseline }: { current: AnalysisResult; baseline: SavedAnalysis }) {
  const radarData = useMemo(
    () => [
      {
        axis: "Stability",
        current: current.scores.movementStability,
        baseline: baseline.result.scores.movementStability,
      },
      {
        axis: "Alignment",
        current: current.scores.jointAlignment,
        baseline: baseline.result.scores.jointAlignment,
      },
      {
        axis: "Landing",
        current: current.scores.landingTechnique,
        baseline: baseline.result.scores.landingTechnique,
      },
      {
        axis: "Balance",
        current: current.scores.balance,
        baseline: baseline.result.scores.balance,
      },
      {
        axis: "Fatigue",
        current: current.scores.fatigueIndicator,
        baseline: baseline.result.scores.fatigueIndicator,
      },
    ],
    [current, baseline],
  );

  const rows: { label: string; cur: number; base: number; better: "higher" | "lower" }[] = [
    {
      label: "Overall risk",
      cur: current.overallRiskPercent,
      base: baseline.result.overallRiskPercent,
      better: "lower",
    },
    {
      label: "Posture",
      cur: current.postureScore,
      base: baseline.result.postureScore,
      better: "higher",
    },
    {
      label: "Performance",
      cur: current.performanceScore,
      base: baseline.result.performanceScore,
      better: "higher",
    },
    {
      label: "Stability",
      cur: current.scores.movementStability,
      base: baseline.result.scores.movementStability,
      better: "higher",
    },
    {
      label: "Alignment",
      cur: current.scores.jointAlignment,
      base: baseline.result.scores.jointAlignment,
      better: "higher",
    },
    {
      label: "Landing",
      cur: current.scores.landingTechnique,
      base: baseline.result.scores.landingTechnique,
      better: "higher",
    },
    {
      label: "Balance",
      cur: current.scores.balance,
      base: baseline.result.scores.balance,
      better: "higher",
    },
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
              <PolarAngleAxis
                dataKey="axis"
                tick={{ fill: "oklch(0.85 0.01 120)", fontSize: 11 }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fill: "oklch(0.6 0.02 150)", fontSize: 10 }}
              />
              <Radar
                name="Current"
                dataKey="current"
                stroke="oklch(0.86 0.21 130)"
                fill="oklch(0.86 0.21 130)"
                fillOpacity={0.35}
              />
              <Radar
                name="Baseline"
                dataKey="baseline"
                stroke="oklch(0.7 0.18 200)"
                fill="oklch(0.7 0.18 200)"
                fillOpacity={0.25}
              />
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
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                      {r.base}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2 text-right font-mono",
                        same ? "text-muted-foreground" : improved ? "text-success" : "text-danger",
                      )}
                    >
                      {delta > 0 ? "+" : ""}
                      {delta}
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
  profile,
  hasHistory,
}: {
  result: AnalysisResult;
  sport: string;
  fileName: string;
  duration: number;
  frames: ExtractedFrame[];
  onSeek: (t: number) => void;
  compareWith: SavedAnalysis | null;
  profile?: any;
  hasHistory?: boolean;
}) {
  const [showAngles, setShowAngles] = useState(false);
  const [annotations, setAnnotations] = useState<Record<number, string>>(() => {
    return (result as any).annotations || {};
  });

  const saveAnnotation = (frameIndex: number, text: string) => {
    const next = { ...annotations, [frameIndex]: text };
    setAnnotations(next);
    (result as any).annotations = next;
    
    // update localStorage history entry
    try {
      const currentHistory = loadHistory();
      const updatedHistory = currentHistory.map((item) => {
        if (
          item.result.movementSummary === result.movementSummary &&
          item.createdAt === (result as any).createdAt
        ) {
          return {
            ...item,
            result: {
              ...item.result,
              annotations: next,
            } as any,
          };
        }
        return item;
      });
      localStorage.setItem("kinetiq.history.v1", JSON.stringify(updatedHistory));
    } catch (e) {
      console.warn("failed to update history annotations", e);
    }
  };

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

  const angleTimelineData = useMemo(() => {
    return frames
      .map((f) => {
        if (!f.joints) return null;
        const lKnee = calculateAngle(f.joints.leftHip, f.joints.leftKnee, f.joints.leftAnkle);
        const rKnee = calculateAngle(f.joints.rightHip, f.joints.rightKnee, f.joints.rightAnkle);
        const lHip = calculateAngle(f.joints.leftShoulder, f.joints.leftHip, f.joints.leftKnee);
        const rHip = calculateAngle(f.joints.rightShoulder, f.joints.rightHip, f.joints.rightKnee);
        const lElbow = calculateAngle(f.joints.leftShoulder, f.joints.leftElbow, f.joints.leftWrist);
        const rElbow = calculateAngle(f.joints.rightShoulder, f.joints.rightElbow, f.joints.rightWrist);

        return {
          time: `${f.timeSec.toFixed(1)}s`,
          timeSec: f.timeSec,
          "L Knee": lKnee ?? 0,
          "R Knee": rKnee ?? 0,
          "L Hip": lHip ?? 0,
          "R Hip": rHip ?? 0,
          "L Elbow": lElbow ?? 0,
          "R Elbow": rElbow ?? 0,
        };
      })
      .filter(Boolean);
  }, [frames]);

  // Map frame stress entries back to extracted frames by nearest timestamp
  const heatmapFrames = useMemo(() => {
    return result.frameStress
      .map((fs) => {
        const idx = clamp(fs.frameIndex, 0, frames.length - 1);
        const f = frames[idx];
        if (!f) return null;
        return { ...fs, dataUrl: f.dataUrl, time: f.timeSec };
      })
      .filter(Boolean) as Array<
      (typeof result.frameStress)[number] & { dataUrl: string; time: number }
    >;
  }, [result, frames]);

  const chatFn = useServerFn(chatWithCoach);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    {
      role: "assistant",
      content: `Hi! I'm your KinetIQ AI Coach. Ask me anything about your ${sport} biomechanics report, your posture score (${result.postureScore}/100), or your active recovery options.`,
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = { role: "user" as const, content: chatInput };
    const updatedMsgs = [...messages, userMsg];
    setMessages(updatedMsgs);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await chatFn({
        data: {
          analysisResult: result,
          profile,
          messages: updatedMsgs,
        },
      });
      setMessages([...updatedMsgs, { role: "assistant", content: res.response }]);
    } catch (err: any) {
      toast.error(err.message || "Failed to get coach response");
    } finally {
      setChatLoading(false);
    }
  };

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
        if (y > 780) {
          doc.addPage();
          y = margin;
        }
        doc.text(ln, margin, y);
        y += size + 4;
      });
    };
    const hr = () => {
      y += 6;
      doc.setDrawColor(200);
      doc.line(margin, y, W - margin, y);
      y += 12;
    };

    wrap("KinetIQ — AI Sports Analysis Report", 20, true);
    wrap(`Sport: ${sport}   ·   File: ${fileName}   ·   ${new Date().toLocaleString()}`, 9);
    hr();
    wrap(
      `Overall injury risk: ${result.overallRiskLevel} (${result.overallRiskPercent}%)`,
      14,
      true,
    );
    wrap(
      `Posture: ${result.postureScore}/100   Performance: ${result.performanceScore}/100   Symmetry: ${result.symmetryIndex !== undefined ? result.symmetryIndex : 90}%   Impact force: ${result.estimatedImpactForce || "N/A"}`,
      11,
    );
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
    if (result.recoveryPlan && result.recoveryPlan.length > 0) {
      hr();
      wrap("Active recovery plan", 13, true);
      result.recoveryPlan.forEach((rec) => wrap(`• ${rec}`));
    }
    if (result.nutritionalTips && result.nutritionalTips.length > 0) {
      hr();
      wrap("Nutrition & hydration tips", 13, true);
      result.nutritionalTips.forEach((tip) => wrap(`• ${tip}`));
    }
    hr();
    wrap("Coach notes", 13, true);
    wrap(result.coachNotes);
    doc.save(`KinetIQ-report-${Date.now()}.pdf`);
  };

  return (
    <section id="report" className="mt-12 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs uppercase font-mono tracking-widest text-primary">
              Analysis report
            </p>
            {profile && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-primary border border-primary/30 animate-pulse">
                <Sparkles className="w-3.5 h-3.5" /> Personalized Profile Active
              </span>
            )}
            {hasHistory && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-accent/20 text-accent border border-accent/30">
                <History className="w-3.5 h-3.5" /> History-Aware Comparison Active
              </span>
            )}
          </div>
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

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <div className="col-span-2 lg:col-span-1">
          <ScoreCard
            label="Overall injury risk"
            value={`${result.overallRiskPercent}%`}
            sub={result.overallRiskLevel}
            tone={
              result.overallRiskLevel === "High"
                ? "danger"
                : result.overallRiskLevel === "Medium"
                  ? "warning"
                  : "success"
            }
            Icon={ShieldAlert}
          />
        </div>
        <ScoreCard
          label="Posture score"
          value={`${result.postureScore}`}
          sub="/ 100"
          tone="primary"
          Icon={Activity}
        />
        <ScoreCard
          label="Performance score"
          value={`${result.performanceScore}`}
          sub="/ 100"
          tone="accent"
          Icon={TrendingUp}
        />
        <ScoreCard
          label="Bilateral Symmetry"
          value={`${result.symmetryIndex !== undefined ? result.symmetryIndex : 90}%`}
          sub={
            (result.symmetryIndex !== undefined ? result.symmetryIndex : 90) >= 85
              ? "Balanced"
              : "Asymmetric"
          }
          tone={
            (result.symmetryIndex !== undefined ? result.symmetryIndex : 90) >= 85
              ? "success"
              : "warning"
          }
          Icon={Scale}
        />
        <ScoreCard
          label="Est. Impact Load"
          value={result.estimatedImpactForce || "2.1G"}
          sub="Peak G-force"
          tone={
            (result.estimatedImpactForce || "").toLowerCase().includes("high")
              ? "danger"
              : (result.estimatedImpactForce || "").toLowerCase().includes("medium")
                ? "warning"
                : "success"
          }
          Icon={Zap}
        />
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
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAngles(!showAngles)}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-md border font-semibold transition-all",
                  showAngles
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background text-muted-foreground border-border hover:text-foreground"
                )}
              >
                {showAngles ? "Hide Joint Angles" : "Show Joint Angles"}
              </button>
              <Legend />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Red glow = high mechanical stress on that joint. Click a frame to jump the video to that
            moment.
          </p>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {heatmapFrames.map((hf, i) => (
              <AnnotatedHeatmapFrame
                key={i}
                frameUrl={hf.dataUrl}
                joints={hf.joints}
                time={hf.time}
                frameIndex={hf.frameIndex}
                showAngles={showAngles}
                onSeek={onSeek}
                note={annotations[hf.frameIndex] || ""}
                onSaveNote={saveAnnotation}
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
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{ fill: "oklch(0.85 0.01 120)", fontSize: 12 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fill: "oklch(0.6 0.02 150)", fontSize: 10 }}
                />
                <Radar
                  dataKey="value"
                  stroke="oklch(0.86 0.21 130)"
                  fill="oklch(0.86 0.21 130)"
                  fillOpacity={0.35}
                />
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
                  <span
                    className={cn(
                      "ml-auto text-xs px-2 py-0.5 rounded-full border font-mono",
                      riskColor(r.level),
                    )}
                  >
                    {r.level} · {r.probabilityPercent}%
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  <span className="text-foreground/80 font-medium">Why:</span> {r.reason}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="text-primary font-medium">Fix:</span> {r.correction}
                </p>
              </li>
            ))}
            {result.injuryRisks.length === 0 && (
              <li className="text-sm text-muted-foreground">
                No significant injury risks detected.
              </li>
            )}
          </ul>
        </div>
      </div>

      {angleTimelineData.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" /> Range of Motion & Joint Angle Tracking
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Flexion angle (in degrees) calculated from body joint vector coordinates across sequential keyframes.
          </p>
          <div className="h-80 mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={angleTimelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                <YAxis domain={[0, 180]} tickFormatter={(val) => `${val}°`} stroke="rgba(255,255,255,0.4)" fontSize={11} />
                <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(20,20,25,0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} labelClassName="text-white text-xs" />
                <RechartsLegend verticalAlign="top" height={36} iconType="circle" />
                <Line type="monotone" dataKey="L Knee" stroke="oklch(0.65 0.25 350)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="R Knee" stroke="oklch(0.7 0.2 30)" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="L Hip" stroke="oklch(0.6 0.2 140)" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="R Hip" stroke="oklch(0.65 0.15 180)" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="L Elbow" stroke="oklch(0.65 0.2 260)" strokeWidth={1.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="R Elbow" stroke="oklch(0.7 0.15 290)" strokeWidth={1.5} strokeDasharray="5 5" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

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
            <li key={i} className="text-muted-foreground">
              <span className="text-foreground">{s}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <h3 className="font-semibold flex items-center gap-2 text-primary">
          <Sparkles className="w-4 h-4" /> AI coach notes
        </h3>
        <p className="mt-2 text-sm leading-relaxed">{result.coachNotes}</p>
      </div>

      {result.recoveryPlan && result.recoveryPlan.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4 text-warning" /> Active Recovery Plan
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground list-disc list-inside">
              {result.recoveryPlan.map((rec, idx) => (
                <li key={idx}><span className="text-foreground">{rec}</span></li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold flex items-center gap-2">
              <Apple className="w-4 h-4 text-success" /> Sports Nutrition & Hydration
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground list-disc list-inside">
              {result.nutritionalTips.map((tip, idx) => (
                <li key={idx}><span className="text-foreground">{tip}</span></li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* AI Coach Interactive Chat Panel */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden mt-6">
        <div className="border-b border-border bg-muted/40 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
            <h3 className="font-semibold flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" /> Interactive AI Coach
            </h3>
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Active Session</span>
        </div>

        <div className="p-5 space-y-4 max-h-96 overflow-y-auto flex flex-col">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed shadow-sm",
                msg.role === "user"
                  ? "self-end bg-primary text-primary-foreground rounded-tr-none"
                  : "self-start bg-muted text-foreground rounded-tl-none"
              )}
            >
              {msg.content}
            </div>
          ))}
          {chatLoading && (
            <div className="self-start bg-muted text-foreground rounded-2xl rounded-tl-none px-4 py-2.5 text-sm flex items-center gap-2 shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>Coach is typing...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleSendChat} className="p-4 border-t border-border bg-muted/20 flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask your coach (e.g., 'How do I fix my landing technique?')..."
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={chatLoading}
          />
          <button
            type="submit"
            disabled={chatLoading || !chatInput.trim()}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
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
        style={{
          background:
            "linear-gradient(to right, hsl(120,90%,50%), hsl(60,90%,50%), hsl(0,90%,50%))",
        }}
      />
      <span>high stress</span>
    </div>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function ScoreCard({
  label,
  value,
  sub,
  tone,
  Icon,
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
    <footer className="w-full py-12 bg-surface-container-lowest border-t border-primary/5 mt-20 relative z-10">
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col gap-2">
          <div className="text-xl font-headline font-bold text-on-surface flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            KinetIQ
          </div>
          <p className="font-body text-xs text-on-surface-variant">
            © 2026 KinetIQ AI Coach. Precision in motion.
          </p>
        </div>
        <div className="flex gap-8 text-xs text-on-surface-variant">
          <a className="hover:text-primary transition-colors duration-200" href="#">
            Privacy Policy
          </a>
          <a className="hover:text-primary transition-colors duration-200" href="#">
            Terms of Service
          </a>
          <span className="font-mono opacity-60">Not medical advice</span>
        </div>
      </div>
    </footer>
  );
}
