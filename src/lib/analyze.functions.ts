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
            })
          )
          .optional(),
      })
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
      })
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

    const googleProvider = createGoogleGenerativeAI({
      apiKey: key,
    });

    const modelsToCall = [
      "gemini-3.5-flash",
      "gemini-3.5-pro",
      "gemini-3.6-flash",
      "gemini-3.6-pro",
    ];

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

    const selectedModel = data.model || "ensemble";

    const imageContent = [
      { type: "text" as const, text: userText },
      ...data.frames.map((f) => ({
        type: "image" as const,
        image: f.dataUrl,
      })),
    ];

    if (selectedModel !== "ensemble") {
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
    }

    console.log(`Sending image frames to models: ${modelsToCall.join(", ")} concurrently...`);

    const modelPromises = modelsToCall.map(async (modelName) => {
      try {
        const model = googleProvider(modelName);
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
        return { modelName, output, success: true as const };
      } catch (err: any) {
        console.error(`Error with model ${modelName}:`, err);
        return { modelName, error: err?.message || String(err), success: false as const };
      }
    });

    const results = await Promise.all(modelPromises);
    const successful = results.filter((r) => r.success);

    if (successful.length === 0) {
      const errorMsg = results.map((r) => `${r.modelName}: ${r.success ? "Success" : r.error}`).join("; ");
      throw new Error(`All Gemini models failed. Details: ${errorMsg}`);
    }

    console.log(`Successfully received analysis from ${successful.length} of ${modelsToCall.length} models: ${successful.map(s => s.modelName).join(", ")}`);

    const successfulOutputs = successful.map((s) => s.output);

    // 1. Mathematically average scores
    const count = successfulOutputs.length;
    const avgOverallRiskPercent = Math.round(successfulOutputs.reduce((sum, o) => sum + o.overallRiskPercent, 0) / count);
    const avgPostureScore = Math.round(successfulOutputs.reduce((sum, o) => sum + o.postureScore, 0) / count);
    const avgPerformanceScore = Math.round(successfulOutputs.reduce((sum, o) => sum + o.performanceScore, 0) / count);

    const avgScores = {
      movementStability: Math.round(successfulOutputs.reduce((sum, o) => sum + o.scores.movementStability, 0) / count),
      jointAlignment: Math.round(successfulOutputs.reduce((sum, o) => sum + o.scores.jointAlignment, 0) / count),
      landingTechnique: Math.round(successfulOutputs.reduce((sum, o) => sum + o.scores.landingTechnique, 0) / count),
      balance: Math.round(successfulOutputs.reduce((sum, o) => sum + o.scores.balance, 0) / count),
      fatigueIndicator: Math.round(successfulOutputs.reduce((sum, o) => sum + o.scores.fatigueIndicator, 0) / count),
    };

    // Determine average risk level
    let avgOverallRiskLevel: "Low" | "Medium" | "High" = "Low";
    if (avgOverallRiskPercent >= 66) {
      avgOverallRiskLevel = "High";
    } else if (avgOverallRiskPercent >= 33) {
      avgOverallRiskLevel = "Medium";
    }

    // 2. Average joint stress positions per frame index
    const avgFrameStress: AnalysisResult["frameStress"] = [];
    const allFrameIndices = Array.from(new Set(successfulOutputs.flatMap((o) => o.frameStress.map((f) => f.frameIndex))));

    for (const frameIdx of allFrameIndices) {
      const matchingFrames = successfulOutputs.flatMap((o) => o.frameStress.filter((f) => f.frameIndex === frameIdx));
      if (matchingFrames.length === 0) continue;

      const avgTimeSec = matchingFrames.reduce((sum, f) => sum + f.timeSec, 0) / matchingFrames.length;

      const jointsByName: Record<string, { x: number; y: number; stress: number; count: number }> = {};
      for (const frame of matchingFrames) {
        for (const joint of frame.joints) {
          if (!jointsByName[joint.name]) {
            jointsByName[joint.name] = { x: 0, y: 0, stress: 0, count: 0 };
          }
          jointsByName[joint.name].x += joint.x;
          jointsByName[joint.name].y += joint.y;
          jointsByName[joint.name].stress += joint.stress;
          jointsByName[joint.name].count += 1;
        }
      }

      const avgJoints = Object.entries(jointsByName).map(([name, val]) => ({
        name: name as any,
        x: Number((val.x / val.count).toFixed(4)),
        y: Number((val.y / val.count).toFixed(4)),
        stress: Number((val.stress / val.count).toFixed(4)),
      }));

      avgFrameStress.push({
        frameIndex: frameIdx,
        timeSec: Number(avgTimeSec.toFixed(3)),
        joints: avgJoints,
      });
    }

    avgFrameStress.sort((a, b) => a.frameIndex - b.frameIndex);

    // 3. Select synthesis model (prefer Pro models if successful, fallback to any)
    const synthesizerObj =
      successful.find((s) => s.modelName === "gemini-3.6-pro") ||
      successful.find((s) => s.modelName === "gemini-3.5-pro") ||
      successful[0];

    console.log(`Synthesizing reports using model: ${synthesizerObj.modelName}`);

    const synthesizerModel = googleProvider(synthesizerObj.modelName);

    const synthesisSystem = `You are an elite sports biomechanics coach and physiotherapist.
You are given a set of reports from different AI vision models analyzing sequential keyframes of an athlete.
You are also given the mathematically averaged biomechanical scores and pose joint stress data.

Your task is to synthesize these reports into a single, cohesive, high-quality, and highly accurate biomechanical analysis report.
The final report MUST use the exact averaged scores and joint stresses provided, and combine/resolve the textual findings, risky moments, injury risks, technique findings, and improvement suggestions into a single consolidated structure.

You MUST respond ONLY with a JSON object that matches the requested schema.`;

    const synthesisUser = `Averaged Biomechanical Scores:
- overallRiskPercent: ${avgOverallRiskPercent} (Risk Level: ${avgOverallRiskLevel})
- postureScore: ${avgPostureScore}
- performanceScore: ${avgPerformanceScore}
- scores: ${JSON.stringify(avgScores)}

Individual Model Reports to Synthesize:
${successful.map((s, idx) => `Report ${idx + 1} (Model: ${s.modelName}):\n${JSON.stringify(s.output)}`).join("\n\n")}

Combine and synthesize the text descriptions, coach notes, technique findings, risky moments, etc. into a single, cohesive report. Keep the list sizes within the schema limits (max 8 for injuryRisks, techniqueFindings, improvementSuggestions, preventionExercises; max 12 for riskyMoments). Make sure the output contains the exact averaged scores, and use the mathematically averaged frameStress (pose data) provided here:
Averaged Pose frameStress:
${JSON.stringify(avgFrameStress)}`;

    const { output: finalOutput } = await generateText({
      model: synthesizerModel,
      system: synthesisSystem,
      output: Output.object({ schema: AnalysisSchema }),
      messages: [
        {
          role: "user",
          content: synthesisUser,
        },
      ],
    });

    // Enforce exact average values on the final response object to guarantee mathematical precision
    finalOutput.overallRiskPercent = avgOverallRiskPercent;
    finalOutput.overallRiskLevel = avgOverallRiskLevel;
    finalOutput.postureScore = avgPostureScore;
    finalOutput.performanceScore = avgPerformanceScore;
    finalOutput.scores = avgScores;
    finalOutput.frameStress = avgFrameStress;

    return finalOutput;
  });
