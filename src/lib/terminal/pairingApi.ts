import { apiFetch, getIamOrigin } from '../apiClient';
import type {
  PairClaimResponse,
  PairCompleteResponse,
  PairStartResponse,
  PairStatusResponse,
} from './pairingTypes';

/**
 * Transitional compatibility for older platform routes. Pairing belongs to the
 * authenticated user/device; workspace_id is never inferred from Vite/browser state.
 */
function compatibilityHeaders(workspaceId?: string | null): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const ws = String(workspaceId || '').trim();
  if (ws) headers['X-IAM-Workspace-Id'] = ws;
  return headers;
}

function compatibilityQuery(workspaceId?: string | null): URLSearchParams {
  const params = new URLSearchParams();
  const ws = String(workspaceId || '').trim();
  if (ws) params.set('workspace_id', ws);
  return params;
}

export async function startDevicePairing(
  /** @deprecated Compatibility hint only; pairing identity is authenticated user + device. */
  workspaceId?: string | null,
  body?: { device_name?: string; platform?: string },
): Promise<PairStartResponse | null> {
  const q = compatibilityQuery(workspaceId);
  const suffix = q.toString();
  const res = await apiFetch<PairStartResponse>(`/api/terminal/pair/start${suffix ? `?${suffix}` : ''}`, {
    method: 'POST',
    headers: compatibilityHeaders(workspaceId),
    body: JSON.stringify(body || {}),
  });
  return res.ok ? res.data : null;
}

export async function fetchPairingStatus(
  pairId: string,
  /** @deprecated Compatibility hint only. */
  workspaceId?: string | null,
): Promise<PairStatusResponse | null> {
  const q = compatibilityQuery(workspaceId);
  q.set('pair_id', pairId);
  const res = await apiFetch<PairStatusResponse>(`/api/terminal/pair/status?${q.toString()}`, {
    headers: compatibilityHeaders(workspaceId),
  });
  return res.ok ? res.data : null;
}

export async function cancelDevicePairing(
  pairId: string,
  /** @deprecated Compatibility hint only. */
  workspaceId?: string | null,
): Promise<boolean> {
  const q = compatibilityQuery(workspaceId);
  const suffix = q.toString();
  const res = await apiFetch<{ ok: boolean }>(
    `/api/terminal/pair/${encodeURIComponent(pairId)}${suffix ? `?${suffix}` : ''}`,
    {
      method: 'DELETE',
      headers: compatibilityHeaders(workspaceId),
    },
  );
  return res.ok && res.data.ok === true;
}

/** Headless claim — used by agentsam-bridge CLI, not browser. */
export async function claimPairingCode(input: {
  code: string;
  device_name: string;
  platform: string;
  shell?: string;
  workerUrl?: string;
}): Promise<PairClaimResponse | null> {
  const origin = (input.workerUrl || getIamOrigin()).replace(/\/$/, '');
  const res = await fetch(`${origin}/api/terminal/pair/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      code: input.code.replace(/\s/g, '').toUpperCase(),
      device_name: input.device_name,
      platform: input.platform,
      shell: input.shell,
    }),
  });
  if (!res.ok) return null;
  return (await res.json()) as PairClaimResponse;
}

export async function completeDevicePairing(input: {
  pairId: string;
  ptyToken: string;
  wsUrl: string;
  tunnelUrl?: string;
  sessionId?: string;
  workerUrl?: string;
}): Promise<PairCompleteResponse | null> {
  const origin = (input.workerUrl || getIamOrigin()).replace(/\/$/, '');
  const res = await fetch(`${origin}/api/terminal/pair/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${input.ptyToken}`,
    },
    body: JSON.stringify({
      pair_id: input.pairId,
      ws_url: input.wsUrl,
      tunnel_url: input.tunnelUrl,
      session_id: input.sessionId,
    }),
  });
  if (!res.ok) return null;
  return (await res.json()) as PairCompleteResponse;
}

export function formatPairingCode(raw: string): string {
  const compact = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8);
  if (compact.length <= 4) return compact;
  return `${compact.slice(0, 4)}-${compact.slice(4)}`;
}

export function buildCliPairCommand(code: string, workerUrl?: string): string {
  const origin = (workerUrl || getIamOrigin() || 'http://localhost:3000').replace(/\/$/, '');
  const formatted = formatPairingCode(code);
  return `npx agentsam-bridge pair ${formatted} --worker ${origin}`;
}
