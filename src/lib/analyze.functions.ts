import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const InputSchema = z.object({
  sport: z.string(),
  notes: z.string().optional().default(""),
  durationSec: z.number().min(0.1).max(600),
  frames: z
    .array(
      z.object({
        dataUrl: z.string(),
        timeSec: z.number(),
        joints: z
          .record(
            z.string(),
            z.object({
              x: z.number(),
              y: z.number(),
              confidence: z.number(),
            }),
          )
          .optional(),
      }),
    )
    .min(1)
    .max(20),
  model: z
    .enum([
      "ensemble",
      "gemini-3.5-flash",
      "gemini-3.5-pro",
      "gemini-3.6-flash",
      "gemini-3.6-pro",
      "llama3.2-vision",
    ])
    .optional()
    .default("ensemble"),
  profile: z
    .object({
      full_name: z.string().nullable().optional(),
      primary_sport: z.string().nullable().optional(),
      injury_history: z.string().nullable().optional(),
      goals: z.string().nullable().optional(),
      height_cm: z.number().nullable().optional(),
      weight_kg: z.number().nullable().optional(),
      dominant_side: z.string().nullable().optional(),
      experience_years: z.number().nullable().optional(),
      training_frequency: z.string().nullable().optional(),
    })
    .optional(),
  pastAnalyses: z
    .array(
      z.object({
        createdAt: z.number(),
        sport: z.string(),
        overallRiskLevel: z.string(),
        overallRiskPercent: z.number(),
        postureScore: z.number(),
        performanceScore: z.number(),
        movementSummary: z.string().optional(),
      }),
    )
    .optional(),
});

const RiskLevel = z.enum(["Low", "Medium", "High"]);

const JointName = z.enum([
  "head",
  "neck",
  "leftShoulder",
  "rightShoulder",
  "leftElbow",
  "rightElbow",
  "leftWrist",
  "rightWrist",
  "leftHip",
  "rightHip",
  "leftKnee",
  "rightKnee",
  "leftAnkle",
  "rightAnkle",
]);

const AnalysisSchema = z.object({
  sportDetected: z.string(),
  movementSummary: z.string(),
  overallRiskLevel: RiskLevel,
  overallRiskPercent: z.number().min(0).max(100),
  postureScore: z.number().min(0).max(100),
  performanceScore: z.number().min(0).max(100),
  symmetryIndex: z.number().min(0).max(100).optional().default(90),
  estimatedImpactForce: z.string().optional().default("2.1G"),
  scores: z.object({
    movementStability: z.number().min(0).max(100),
    jointAlignment: z.number().min(0).max(100),
    landingTechnique: z.number().min(0).max(100),
    balance: z.number().min(0).max(100),
    fatigueIndicator: z.number().min(0).max(100),
  }),
  injuryRisks: z
    .array(
      z.object({
        bodyPart: z.string(),
        injury: z.string(),
        level: RiskLevel,
        probabilityPercent: z.number().min(0).max(100),
        reason: z.string(),
        correction: z.string(),
      }),
    )
    .max(8),
  techniqueFindings: z
    .array(z.object({ area: z.string(), observation: z.string(), suggestion: z.string() }))
    .max(8),
  improvementSuggestions: z.array(z.string()).max(8),
  preventionExercises: z
    .array(z.object({ name: z.string(), targets: z.string(), sets: z.string() }))
    .max(8),
  recoveryPlan: z.array(z.string()).max(6).optional().default([]),
  nutritionalTips: z.array(z.string()).max(6).optional().default([]),
  coachNotes: z.string(),
  riskyMoments: z
    .array(
      z.object({
        timeSec: z.number().min(0),
        label: z.string(),
        severity: RiskLevel,
        explanation: z.string(),
      }),
    )
    .max(12),
  frameStress: z
    .array(
      z.object({
        frameIndex: z.number().int().min(0),
        timeSec: z.number().min(0),
        joints: z
          .array(
            z.object({
              name: JointName,
              // normalized 0..1 from top-left of frame
              x: z.number().min(0).max(1),
              y: z.number().min(0).max(1),
              // 0 = safe, 1 = high stress
              stress: z.number().min(0).max(1),
            }),
          )
          .max(14),
      }),
    )
    .max(20),
});

export type AnalysisResult = z.infer<typeof AnalysisSchema>;
export type AnalysisJoint = AnalysisResult["frameStress"][number]["joints"][number];

export const analyzePose = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }): Promise<AnalysisResult> => {
    const key = process.env.AI_API_KEY;
    if (!key) throw new Error("AI_API_KEY not configured");

    const googleProvider = createGoogleGenerativeAI({
      apiKey: key,
    });

    const selectedModel = data.model || "gemini-3.5-flash";

    const system = `You are an elite sports biomechanics coach and physiotherapist.
You analyze sequential keyframes (with timestamps in seconds) of an athlete and assess
pose, joint angles, balance, landing mechanics, and injury risk. You MUST respond ONLY
with a JSON object that matches the requested schema.

Joint position requirements (frameStress):
- For EACH frame provided, return entries for as many of these joints as are visible:
  head, neck, leftShoulder, rightShoulder, leftElbow, rightElbow, leftWrist, rightWrist,
  leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle.
- x and y are NORMALIZED coordinates in [0,1] from the TOP-LEFT of that frame image.
- stress is in [0,1]: 0 = neutral/safe load, 1 = high mechanical stress / injury risk for that joint at that moment.
- Use anatomical "left/right" from the athlete's perspective; if uncertain, infer from limb position.

Risky moments (riskyMoments):
- Use the timestamps of the provided keyframes (or close to them) for timeSec.
- Each item flags a specific moment in the clip where injury risk spikes
  (e.g. "Knee valgus on landing", "Excessive trunk lean at foot strike").

Scores and indexes (including symmetryIndex) are 0–100 where 100 = professional level / perfect symmetry.
Provide estimatedImpactForce as a G-force estimate (e.g. "2.4G - Medium Impact", "1.1G - Low Impact", "4.8G - High Impact").
Be specific, technical, and practical.`;

    const frameList = data.frames
      .map((f, i) => `  - frame ${i} at t=${f.timeSec.toFixed(2)}s`)
      .join("\n");

    let profileText = "";
    if (data.profile) {
      const p = data.profile;
      profileText = `

Athlete Personal Profile & Biometrics:
- Primary Sport: ${p.primary_sport || "N/A"}
- Experience: ${p.experience_years ? p.experience_years + " years" : "N/A"}
- Training Frequency: ${p.training_frequency || "N/A"}
- Height: ${p.height_cm ? p.height_cm + " cm" : "N/A"}
- Weight: ${p.weight_kg ? p.weight_kg + " kg" : "N/A"}
- Dominant Side: ${p.dominant_side || "N/A"}
- Personal Goals: ${p.goals || "N/A"}
- INJURY HISTORY (pay close attention to relevant joint stress/vulnerability): ${p.injury_history || "None reported"}`;
    }

    let historyText = "";
    if (data.pastAnalyses && data.pastAnalyses.length > 0) {
      const pastList = data.pastAnalyses
        .map(
          (a) =>
            `- Date: ${new Date(a.createdAt).toLocaleDateString()} | Sport: ${a.sport} | Risk: ${a.overallRiskLevel} (${a.overallRiskPercent}%) | Posture Score: ${a.postureScore} | Performance Score: ${a.performanceScore}${a.movementSummary ? ` | Summary: ${a.movementSummary}` : ""}`
        )
        .join("\n");
      historyText = `

Athlete Past Performance & Injury History (order from most recent to oldest):
${pastList}

CRITICAL: Please evaluate the athlete's progress compared to their past runs.
Contrast current posture score, performance score, joint stress, and risk level with the previous metrics.
Mention specific improvements, regressions, or chronic persistent issues (like repeated knee/ankle load) in the "coachNotes" and "movementSummary".`;
    }

    let jointsText = "";
    const framesWithJoints = data.frames.filter((f) => f.joints);
    if (framesWithJoints.length > 0) {
      jointsText = `\n\nMATHEMATICALLY TRACKED JOINT COORDINATES (MediaPipe Pose Landmarks):
For your reference, high-precision computer-vision tracked coordinates (normalized x,y from top-left, 0 to 1) are available for each keyframe:
${data.frames.map((f, idx) => {
  if (!f.joints) return `- Frame ${idx}: No physical coordinates detected.`;
  const jointsStr = Object.entries(f.joints)
    .map(([name, pt]) => `${name}: (x=${pt.x.toFixed(3)}, y=${pt.y.toFixed(3)}, conf=${pt.confidence.toFixed(2)})`)
    .join(", ");
  return `- Frame ${idx} (t=${f.timeSec.toFixed(2)}s): ${jointsStr}`;
}).join("\n")}

CRITICAL: Use these coordinates to compute frameStress and joint alignment in your output. Verify if there is symmetry or alignment issues using these exact coordinates.`;
    }

    const userText = `Sport context: ${data.sport}.
Athlete/Coach notes: ${data.notes || "(none)"}.${profileText}${historyText}${jointsText}
Clip duration: ${data.durationSec.toFixed(2)}s.
Provided keyframes (${data.frames.length}, in order):
${frameList}

Analyze pose, joint alignment, valgus/varus tendencies, trunk lean, landing softness,
stride symmetry, arm mechanics, and balance. Produce the structured report including
frameStress for the heatmap and riskyMoments tied to the timestamps above.`;

    const imageContent = [
      { type: "text" as const, text: userText },
      ...data.frames.map((f) => ({
        type: "image" as const,
        image: f.dataUrl,
      })),
    ];

    console.log(`Running single model analysis using: ${selectedModel}`);
    let model;
    if (selectedModel === "llama3.2-vision") {
      const ollamaKey = process.env.OLLAMA_API_KEY;
      if (!ollamaKey) throw new Error("OLLAMA_API_KEY not configured");
      const ollamaProvider = createOpenAICompatible({
        name: "ollama",
        baseURL: "https://ollama.com/v1",
        headers: {
          Authorization: `Bearer ${ollamaKey}`,
        },
      });
      model = ollamaProvider(selectedModel);
    } else {
      model = googleProvider(selectedModel);
    }

    const { output } = await generateText({
      model,
      system,
      output: Output.object({ schema: AnalysisSchema }),
      messages: [
        {
          role: "user",
          content: imageContent,
        },
      ],
    });
    return output;
  });

export const chatWithCoach = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      analysisResult: z.any(),
      profile: z.any().optional(),
      messages: z.array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
        })
      ),
    })
  )
  .handler(async ({ data }) => {
    const key = process.env.AI_API_KEY;
    if (!key) throw new Error("AI_API_KEY not configured");

    const googleProvider = createGoogleGenerativeAI({
      apiKey: key,
    });

    const system = `You are KinetIQ's Interactive AI Sports Coach & Biomechanics Specialist.
The user has completed a sports movement analysis. You have access to their latest Analysis Report and their Profile.
Your goal is to answer their questions about their results, guide them on form corrections, explain biomechanical terms in an accessible way, and suggest specific training and recovery protocols.

Guidelines:
- Reference their exact metrics (e.g. "Your posture score is ${data.analysisResult.postureScore}/100" or "Your knee risk was flagged as High").
- Give practical, safe, athletic-coaching suggestions.
- Be encouraging, technical, and precise. Keep responses structured and easy to read.

Latest Analysis Report Context:
${JSON.stringify(data.analysisResult, null, 2)}

Athlete Profile:
${JSON.stringify(data.profile || {}, null, 2)}`;

    const { text } = await generateText({
      model: googleProvider("gemini-3.5-flash"),
      system,
      messages: data.messages,
    });

    return { response: text };
  });

