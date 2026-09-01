export interface TelemetryData {
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  model: string;
  cost: number;
}

export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  // Simplified pricing (per 1M tokens) - update based on actual pricing
  const prices: Record<string, { input: number, output: number }> = {
    'gemini-3.1-flash-lite-preview': { input: 0.075, output: 0.3 },
    'gemini-3.7-flash': { input: 0.1, output: 0.4 },
  };

  const modelPrice = prices[model] || { input: 0.1, output: 0.4 };
  return (inputTokens / 1_000_000) * modelPrice.input + (outputTokens / 1_000_000) * modelPrice.output;
}

export function logTelemetry(data: TelemetryData) {
  console.log("Telemetry:", JSON.stringify(data));
  // In a real production system, you'd send this to a backend/analytics service
}
