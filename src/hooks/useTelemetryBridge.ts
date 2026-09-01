import { useCallback, useEffect, useState } from 'react';
import type { TelemetryData } from '../lib/telemetry';
import { calculateCost } from '../lib/telemetry';
import { apiFetch } from '../lib/apiClient';

type AgentTelemetryPayload = {
  runs?: Array<{
    model?: string;
    latency_ms?: number;
    input_tokens?: number;
    output_tokens?: number;
  }>;
};

export function useTelemetryBridge(localEntries: TelemetryData[]) {
  const [remoteEntries, setRemoteEntries] = useState<TelemetryData[]>([]);

  const refresh = useCallback(async () => {
    const res = await apiFetch<AgentTelemetryPayload>('/api/agent/telemetry');
    if (!res.ok) return;
    const mapped: TelemetryData[] = (res.data.runs || []).slice(0, 20).map((r) => ({
      latencyMs: r.latency_ms ?? 0,
      inputTokens: r.input_tokens ?? 0,
      outputTokens: r.output_tokens ?? 0,
      model: r.model ?? 'unknown',
      cost: calculateCost(r.model ?? 'unknown', r.input_tokens ?? 0, r.output_tokens ?? 0),
    }));
    setRemoteEntries(mapped);
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 120_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  return [...localEntries, ...remoteEntries];
}
