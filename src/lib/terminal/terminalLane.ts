import { apiFetch, getWorkspaceId, workspaceQuery } from '../apiClient';
import type { ExecutionLane } from '../../types';
import { DEFAULT_TERMINAL_LANE, type TerminalLaneTarget } from './pairingTypes';

export type TerminalConnectionSnapshot = {
  has_local?: boolean;
  connection?: {
    id?: string;
    is_active?: boolean;
    ws_url_present?: boolean;
    platform?: string;
    hostname?: string | null;
  } | null;
};

export type TerminalTargetsSnapshot = {
  local?: { ready?: boolean; connection_active?: boolean };
  platform_vm?: { ready?: boolean };
  user_hosted_tunnel?: { ready?: boolean; connection_active?: boolean };
};

const LANE_STORAGE_KEY = 'workmode.terminal_lane';

export function executionLaneToTarget(lane: ExecutionLane): TerminalLaneTarget {
  if (lane === 'gcp_vm') return 'platform_vm';
  if (lane === 'cloud_sandbox') return 'sandbox';
  return 'user_hosted_tunnel';
}

export function targetToExecutionLane(target: TerminalLaneTarget): ExecutionLane {
  if (target === 'platform_vm') return 'gcp_vm';
  if (target === 'sandbox') return 'cloud_sandbox';
  return 'local_mac';
}

export function readPreferredTerminalLane(): TerminalLaneTarget {
  if (typeof window === 'undefined') return DEFAULT_TERMINAL_LANE;
  const stored = localStorage.getItem(LANE_STORAGE_KEY);
  if (stored === 'user_hosted_tunnel' || stored === 'platform_vm' || stored === 'sandbox') {
    return stored;
  }
  return DEFAULT_TERMINAL_LANE;
}

export function persistPreferredTerminalLane(lane: TerminalLaneTarget): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LANE_STORAGE_KEY, lane);
}

export async function fetchLocalTerminalConnection(
  workspaceId?: string | null,
): Promise<TerminalConnectionSnapshot | null> {
  const q = workspaceQuery(workspaceId);
  const res = await apiFetch<TerminalConnectionSnapshot>(`/api/terminal/connections/local?${q}`);
  return res.ok ? res.data : null;
}

export async function fetchTerminalTargets(
  workspaceId?: string | null,
): Promise<TerminalTargetsSnapshot | null> {
  const q = workspaceQuery(workspaceId);
  const res = await apiFetch<TerminalTargetsSnapshot>(`/api/terminal/connections/targets?${q}`);
  return res.ok ? res.data : null;
}

/**
 * Default lane: user_hosted_tunnel when an active local connection exists;
 * otherwise still prefer user_hosted_tunnel (pairing UX) unless caller overrides.
 */
export async function resolveDefaultTerminalLane(
  workspaceId?: string | null,
): Promise<TerminalLaneTarget> {
  const preferred = readPreferredTerminalLane();
  const local = await fetchLocalTerminalConnection(workspaceId ?? getWorkspaceId());
  const active = local?.connection?.is_active === true;
  if (active) return 'user_hosted_tunnel';
  if (preferred === 'platform_vm' || preferred === 'sandbox') return preferred;
  return DEFAULT_TERMINAL_LANE;
}
