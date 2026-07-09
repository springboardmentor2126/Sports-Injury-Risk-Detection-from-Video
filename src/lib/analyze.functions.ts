import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createAiGatewayProvider } from "./ai-gateway.server";

const InputSchema = z.object({
  sport: z.string(),
  notes: z.string().optional().default(""),
  durationSec: z.number().min(0.1).max(600),
  frames: z
    .array(z.object({ dataUrl: z.string(), timeSec: z.number() }))
    .min(1)
    .max(20),
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

    const gateway = createAiGatewayProvider(key);
    const model = gateway("gemini-2.0-flash");

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

Scores are 0–100 where 100 = professional level. Be specific, technical, and practical.`;

    const frameList = data.frames
      .map((f, i) => `  - frame ${i} at t=${f.timeSec.toFixed(2)}s`)
      .join("\n");

    const userText = `Sport context: ${data.sport}.
Athlete/Coach notes: ${data.notes || "(none)"}.
Clip duration: ${data.durationSec.toFixed(2)}s.
Provided keyframes (${data.frames.length}, in order):
${frameList}

Analyze pose, joint alignment, valgus/varus tendencies, trunk lean, landing softness,
stride symmetry, arm mechanics, and balance. Produce the structured report including
frameStress for the heatmap and riskyMoments tied to the timestamps above.`;

    const { output } = await generateText({
      model,
      system: system,
      output: Output.object({ schema: AnalysisSchema }),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: userText },
            ...data.frames.map((f) => ({
              type: "image" as const,
              image: f.dataUrl,
            })),
          ],
        },
      ],
    });

    return output;
  });
