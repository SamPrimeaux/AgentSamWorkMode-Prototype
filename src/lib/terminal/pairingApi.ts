import { apiFetch, getIamOrigin, getWorkspaceId, workspaceQuery } from '../apiClient';
import type {
  PairClaimResponse,
  PairCompleteResponse,
  PairStartResponse,
  PairStatusResponse,
} from './pairingTypes';

function wsHeaders(workspaceId?: string | null): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const ws = (workspaceId || getWorkspaceId()).trim();
  if (ws) h['X-IAM-Workspace-Id'] = ws;
  return h;
}

export async function startDevicePairing(
  workspaceId?: string | null,
  body?: { device_name?: string; platform?: string },
): Promise<PairStartResponse | null> {
  const q = workspaceQuery(workspaceId);
  const res = await apiFetch<PairStartResponse>(`/api/terminal/pair/start?${q}`, {
    method: 'POST',
    headers: wsHeaders(workspaceId),
    body: JSON.stringify(body || {}),
  });
  return res.ok ? res.data : null;
}

export async function fetchPairingStatus(
  pairId: string,
  workspaceId?: string | null,
): Promise<PairStatusResponse | null> {
  const q = new URLSearchParams(workspaceQuery(workspaceId));
  q.set('pair_id', pairId);
  const res = await apiFetch<PairStatusResponse>(`/api/terminal/pair/status?${q.toString()}`, {
    headers: wsHeaders(workspaceId),
  });
  return res.ok ? res.data : null;
}

export async function cancelDevicePairing(
  pairId: string,
  workspaceId?: string | null,
): Promise<boolean> {
  const q = workspaceQuery(workspaceId);
  const res = await apiFetch<{ ok: boolean }>(`/api/terminal/pair/${encodeURIComponent(pairId)}?${q}`, {
    method: 'DELETE',
    headers: wsHeaders(workspaceId),
  });
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
