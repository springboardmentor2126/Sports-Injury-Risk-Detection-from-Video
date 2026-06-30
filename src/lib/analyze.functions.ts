import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const InputSchema = z.object({
  sport: z.string(),
  notes: z.string().optional().default(""),
  frames: z.array(z.string()).min(1).max(10), // data URLs
});

const RiskLevel = z.enum(["Low", "Medium", "High"]);

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
});

export type AnalysisResult = z.infer<typeof AnalysisSchema>;

export const analyzePose = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }): Promise<AnalysisResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY not configured");

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const system = `You are an elite sports biomechanics coach and physiotherapist.
You analyze sequential video frames (keyframes) of an athlete and assess pose,
joint angles, balance, landing mechanics, and injury risk. You must respond ONLY
with a JSON object that matches the requested schema. Be specific, technical, and
practical. Numeric scores: 0 = terrible, 100 = professional level. Risk percent is
the probability of injury if pattern continues. If frames are unclear or do not
contain a human athlete, still produce best-effort estimates with low confidence
language in observations.`;

    const userText = `Sport context: ${data.sport}.
Athlete/Coach notes: ${data.notes || "(none)"}.
You are given ${data.frames.length} sequential keyframes from a single performance clip.
Analyze pose, joint alignment, valgus/varus tendencies, trunk lean, landing softness,
stride symmetry, arm mechanics, and balance. Produce the structured report.`;

    const { experimental_output } = await generateText({
      model,
      experimental_output: Output.object({ schema: AnalysisSchema }),
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            { type: "text", text: userText },
            ...data.frames.map((url) => ({
              type: "image" as const,
              image: url,
            })),
          ],
        },
      ],
    });

    return experimental_output;
  });
