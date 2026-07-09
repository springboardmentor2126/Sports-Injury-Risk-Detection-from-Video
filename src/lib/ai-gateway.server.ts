import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createAiGatewayProvider(apiKey: string) {
  if (apiKey.startsWith("AIzaSy")) {
    return createOpenAICompatible({
      name: "gemini",
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
  }

  return createOpenAICompatible({
    name: "gateway",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
}
