import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createAiGatewayProvider(apiKey: string) {
  // Detect if the key is a direct Google Gemini API Key.
  // Google's new service-account bound keys start with "AQ." but are different from Lovable's sandbox key.
  const isDirectGoogle = apiKey.startsWith("AIzaSy") || !apiKey.includes("LDubc7hnFLTbkxX9ZJRmIHwzsmKY_E1nLhqHoyXRKyBg");

  if (isDirectGoogle) {
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
