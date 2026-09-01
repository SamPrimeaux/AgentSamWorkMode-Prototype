import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch, getWorkspaceId, workspaceQuery } from '../lib/apiClient';
import {
  DEFAULT_TERMINAL_LANE,
  type TerminalLaneTarget,
} from '../lib/terminal/pairingTypes';
import {
  fetchLocalTerminalConnection,
  persistPreferredTerminalLane,
  readPreferredTerminalLane,
  resolveDefaultTerminalLane,
} from '../lib/terminal/terminalLane';

export type TerminalConfigStatus = {
  terminal_enabled?: boolean;
  terminal_configured?: boolean;
  control_plane_available?: boolean;
  direct_wss_available?: boolean;
  ws_url?: string;
  error_code?: string | null;
  workspace_id?: string;
  user_id?: string;
  selected_target_type?: string;
};

export type TerminalBridgeState = {
  config: TerminalConfigStatus | null;
  connected: boolean;
  connecting: boolean;
  authRequired: boolean;
  lastError: string | null;
  targetType: TerminalLaneTarget;
  localConnectionActive: boolean;
};

/**
 * Terminal bridge: config-status probe, one-shot exec, optional WebSocket log stream.
 * Defaults to user_hosted_tunnel (your machine) when a local connection is active or preferred.
 */
export function useTerminalBridge(options?: {
  workspaceId?: string | null;
  targetType?: TerminalLaneTarget;
  onOutputLine?: (line: string) => void;
}) {
  const [targetType, setTargetType] = useState<TerminalLaneTarget>(
    options?.targetType ?? readPreferredTerminalLane(),
  );
  const [localConnectionActive, setLocalConnectionActive] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const [state, setState] = useState<TerminalBridgeState>({
    config: null,
    connected: false,
    connecting: false,
    authRequired: false,
    lastError: null,
    targetType: options?.targetType ?? DEFAULT_TERMINAL_LANE,
    localConnectionActive: false,
  });

  const appendLine = useCallback(
    (line: string) => {
      options?.onOutputLine?.(line);
    },
    [options],
  );

  const refreshLocalLane = useCallback(async () => {
    const local = await fetchLocalTerminalConnection(options?.workspaceId);
    const active = local?.connection?.is_active === true;
    setLocalConnectionActive(active);
    setState((s) => ({ ...s, localConnectionActive: active }));
    if (!options?.targetType && active) {
      setTargetType('user_hosted_tunnel');
    }
    return active;
  }, [options?.targetType, options?.workspaceId]);

  const setLane = useCallback((lane: TerminalLaneTarget) => {
    setTargetType(lane);
    persistPreferredTerminalLane(lane);
    setState((s) => ({ ...s, targetType: lane }));
  }, []);

  const refreshConfig = useCallback(async () => {
    const ws = options?.workspaceId ?? getWorkspaceId();
    const base = workspaceQuery(ws);
    const params = new URLSearchParams(base);
    params.set('target_type', targetType);
    const res = await apiFetch<TerminalConfigStatus>(
      `/api/agent/terminal/config-status?${params.toString()}`,
    );
    if (!res.ok) {
      setState((s) => ({
        ...s,
        config: null,
        authRequired: res.error.status === 401,
        lastError: res.error.error,
        targetType,
        localConnectionActive,
      }));
      return null;
    }
    setState((s) => ({
      ...s,
      config: res.data,
      authRequired: false,
      lastError: null,
      targetType,
      localConnectionActive,
    }));
    return res.data;
  }, [localConnectionActive, options?.workspaceId, targetType]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setState((s) => ({ ...s, connected: false, connecting: false }));
  }, []);

  const connectWebSocket = useCallback(async () => {
    const cfg = await refreshConfig();
    if (!cfg?.terminal_enabled) {
      appendLine('[terminal] Not enabled — connect your machine or check workspace policy.');
      return false;
    }

    const ws = options?.workspaceId ?? getWorkspaceId();
    const params = new URLSearchParams(workspaceQuery(ws));
    params.set('target_type', targetType);
    params.set('execution_mode', 'pty');
    params.set('pty_client', 'workmode-prototype');

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const wsOrigin = origin.replace(/^http/, 'ws');
    const wsUrl = `${wsOrigin}/api/agent/terminal/ws?${params.toString()}`;

    setState((s) => ({ ...s, connecting: true, lastError: null }));
    try {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setState((s) => ({ ...s, connected: true, connecting: false }));
        appendLine(`[terminal] WebSocket connected (${targetType})`);
      };
      socket.onmessage = (ev) => {
        const text = typeof ev.data === 'string' ? ev.data : '';
        if (text) appendLine(text.replace(/\r?\n$/, ''));
      };
      socket.onerror = () => {
        setState((s) => ({
          ...s,
          connecting: false,
          connected: false,
          lastError: 'WebSocket error',
        }));
        appendLine('[terminal] WebSocket error — pair your machine or use platform VM lane.');
      };
      socket.onclose = () => {
        setState((s) => ({ ...s, connected: false, connecting: false }));
        wsRef.current = null;
      };
      return true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'connect failed';
      setState((s) => ({ ...s, connecting: false, lastError: msg }));
      appendLine(`[terminal] ${msg}`);
      return false;
    }
  }, [appendLine, options?.workspaceId, refreshConfig, targetType]);

  const execCommand = useCallback(
    async (command: string) => {
      const ws = options?.workspaceId ?? getWorkspaceId();
      const q = workspaceQuery(ws);
      appendLine(`% ${command}`);
      const res = await apiFetch<{ output?: string; stdout?: string; stderr?: string; exit_code?: number }>(
        `/api/agent/terminal/exec?${q}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command,
            target_type: targetType,
            execution_mode: 'batch_exec',
          }),
        },
      );
      if (!res.ok) {
        appendLine(`[exec] ${res.error.error} (${res.error.status})`);
        if (res.error.status === 401) {
          setState((s) => ({ ...s, authRequired: true }));
        }
        return res;
      }
      const out = res.data.stdout || res.data.output || res.data.stderr || '';
      if (out) appendLine(out);
      if (res.data.exit_code != null) appendLine(`[exit ${res.data.exit_code}]`);
      return res;
    },
    [appendLine, options?.workspaceId, targetType],
  );

  const sendInput = useCallback((data: string) => {
    const socket = wsRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(data);
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (options?.targetType) {
        setTargetType(options.targetType);
        return;
      }
      const lane = await resolveDefaultTerminalLane(options?.workspaceId);
      if (!cancelled) {
        setTargetType(lane);
        setState((s) => ({ ...s, targetType: lane }));
      }
      await refreshLocalLane();
    })();
    return () => {
      cancelled = true;
      disconnect();
    };
  }, [disconnect, options?.targetType, options?.workspaceId, refreshLocalLane]);

  useEffect(() => {
    void refreshConfig();
  }, [refreshConfig, targetType]);

  return {
    ...state,
    targetType,
    setLane,
    refreshLocalLane,
    refreshConfig,
    connectWebSocket,
    disconnect,
    execCommand,
    sendInput,
  };
}