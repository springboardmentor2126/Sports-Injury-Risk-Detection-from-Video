import { createGoogleGenerativeAI } from "@ai-sdk/google";

export function createAiGatewayProvider(apiKey: string) {
  return createGoogleGenerativeAI({
    apiKey: apiKey,
  });
}
