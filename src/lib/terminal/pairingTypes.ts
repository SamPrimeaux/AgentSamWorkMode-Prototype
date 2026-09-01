export type PairingStatus = 'pending' | 'claimed' | 'connected' | 'expired' | 'cancelled';

export type PairStartResponse = {
  ok: boolean;
  pair_id: string;
  code: string;
  expires_at: number;
  cli_command: string;
  worker_url: string;
};

export type PairStatusResponse = {
  ok: boolean;
  pair_id: string;
  status: PairingStatus;
  code?: string;
  device_name?: string | null;
  platform?: string | null;
  claimed_at?: number | null;
  connected_at?: number | null;
  connection_id?: string | null;
  expires_at?: number;
};

export type PairClaimResponse = {
  ok: boolean;
  pair_id: string;
  pty_token: string;
  worker_url: string;
  workspace_id: string;
  user_id: string;
  connection_id?: string | null;
  register_url: string;
  instructions: string;
};

export type PairCompleteResponse = {
  ok: boolean;
  connection_activated: boolean;
  connection_id?: string | null;
};

export type TerminalLaneTarget = 'user_hosted_tunnel' | 'platform_vm' | 'sandbox';

export const DEFAULT_TERMINAL_LANE: TerminalLaneTarget = 'user_hosted_tunnel';

export const TERMINAL_LANE_OPTIONS: {
  id: TerminalLaneTarget;
  label: string;
  sublabel: string;
  requiresPairing?: boolean;
}[] = [
  {
    id: 'user_hosted_tunnel',
    label: 'Your machine',
    sublabel: 'localhost · Docker · your Cloudflare tunnel',
    requiresPairing: true,
  },
  {
    id: 'platform_vm',
    label: 'Cloud VM',
    sublabel: 'Zero-config platform shell',
  },
  {
    id: 'sandbox',
    label: 'Sandbox',
    sublabel: 'Isolated ephemeral container',
  },
];
