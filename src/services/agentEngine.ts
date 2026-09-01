import { ModelChoice } from '../types';
import { TelemetryData, calculateCost } from '../lib/telemetry';

export interface AgentRunResult {
  text: string;
  telemetry?: TelemetryData;
}

export async function executeAgentSamTask(
  prompt: string,
  model: ModelChoice = 'gemini-3.5-flash',
): Promise<AgentRunResult> {
  const startTime = performance.now();

  try {
    const res = await fetch('/api/gemini/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        model,
        systemInstruction: `You are Agent Sam, a senior autonomous execution agent.
Respond concisely with actionable steps. When you lack live workspace data, say so and ask what to inspect or run next.
Do not invent test results, git status, deployment URLs, or file contents.`,
      }),
    });

    const endTime = performance.now();
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || `Agent request failed (${res.status})`);
    }

    if (data.fallback || !data.text) {
      return {
        text:
          data.message ||
          'Agent backend is not configured. Set GEMINI_API_KEY on the server, or connect ExecOS for live execution.',
        telemetry: {
          latencyMs: endTime - startTime,
          inputTokens: 0,
          outputTokens: 0,
          model,
          cost: 0,
        },
      };
    }

    return {
      text: data.text,
      telemetry: {
        latencyMs: endTime - startTime,
        inputTokens: 0,
        outputTokens: 0,
        model: data.model || model,
        cost: calculateCost(data.model || model, 0, 0),
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown agent error';
    return {
      text: `Could not reach the agent backend: ${message}`,
      telemetry: {
        latencyMs: performance.now() - startTime,
        inputTokens: 0,
        outputTokens: 0,
        model,
        cost: 0,
      },
    };
  }
}
