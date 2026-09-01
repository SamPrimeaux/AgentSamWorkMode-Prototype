import { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildCliPairCommand,
  cancelDevicePairing,
  fetchPairingStatus,
  startDevicePairing,
} from '../lib/terminal/pairingApi';
import type { PairingStatus, PairStartResponse } from '../lib/terminal/pairingTypes';
import { fetchLocalTerminalConnection } from '../lib/terminal/terminalLane';

export type DevicePairingState = {
  pairId: string | null;
  code: string | null;
  cliCommand: string | null;
  status: PairingStatus | 'idle';
  expiresAt: number | null;
  deviceName: string | null;
  platform: string | null;
  connectionId: string | null;
  isLocalConnectionActive: boolean;
  loading: boolean;
  error: string | null;
};

const POLL_MS = 2000;

export function useDevicePairing(workspaceId?: string | null) {
  const [state, setState] = useState<DevicePairingState>({
    pairId: null,
    code: null,
    cliCommand: null,
    status: 'idle',
    expiresAt: null,
    deviceName: null,
    platform: null,
    connectionId: null,
    isLocalConnectionActive: false,
    loading: false,
    error: null,
  });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const refreshLocalConnection = useCallback(async () => {
    const local = await fetchLocalTerminalConnection(workspaceId);
    const active = local?.connection?.is_active === true;
    setState((s) => ({ ...s, isLocalConnectionActive: active }));
    return active;
  }, [workspaceId]);

  const pollPairStatus = useCallback(
    async (pairId: string) => {
      const row = await fetchPairingStatus(pairId, workspaceId);
      if (!row) return;
      setState((s) => ({
        ...s,
        status: row.status,
        deviceName: row.device_name ?? s.deviceName,
        platform: row.platform ?? s.platform,
        connectionId: row.connection_id ?? s.connectionId,
        expiresAt: row.expires_at ?? s.expiresAt,
      }));
      if (row.status === 'connected') {
        stopPolling();
        await refreshLocalConnection();
      }
      if (row.status === 'expired' || row.status === 'cancelled') {
        stopPolling();
      }
    },
    [refreshLocalConnection, stopPolling, workspaceId],
  );

  const beginPairing = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const started: PairStartResponse | null = await startDevicePairing(workspaceId);
    if (!started?.pair_id || !started.code) {
      setState((s) => ({
        ...s,
        loading: false,
        error: 'Could not start pairing — sign in at IAM origin or check workspace.',
      }));
      return null;
    }
    const cli = started.cli_command || buildCliPairCommand(started.code);
    setState((s) => ({
      ...s,
      loading: false,
      pairId: started.pair_id,
      code: started.code,
      cliCommand: cli,
      status: 'pending',
      expiresAt: started.expires_at,
      error: null,
    }));
    stopPolling();
    pollRef.current = setInterval(() => {
      void pollPairStatus(started.pair_id);
    }, POLL_MS);
    void pollPairStatus(started.pair_id);
    return started;
  }, [pollPairStatus, stopPolling, workspaceId]);

  const cancelPairing = useCallback(async () => {
    stopPolling();
    if (state.pairId) {
      await cancelDevicePairing(state.pairId, workspaceId);
    }
    setState((s) => ({
      ...s,
      pairId: null,
      code: null,
      cliCommand: null,
      status: 'idle',
      expiresAt: null,
      deviceName: null,
      platform: null,
      error: null,
    }));
  }, [state.pairId, stopPolling, workspaceId]);

  useEffect(() => {
    void refreshLocalConnection();
    return () => stopPolling();
  }, [refreshLocalConnection, stopPolling]);

  return {
    ...state,
    beginPairing,
    cancelPairing,
    refreshLocalConnection,
    isPaired: state.status === 'connected' || state.isLocalConnectionActive,
  };
}
