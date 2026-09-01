import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../lib/apiClient';
import { getOrCreatePtyClientId } from '../lib/ptyClientId';
import {
  DEFAULT_TERMINAL_LANE,
  type TerminalLaneTarget,
} from '../lib/terminal/pairingTypes';
import {
  fetchLocalTerminalConnection,
  persistPreferredTerminalLane,
  readPreferredTerminalLane,
} from '../lib/terminal/terminalLane';

export type TerminalConfigStatus = {
  terminal_enabled?: boolean;
  terminal_configured?: boolean;
  control_plane_available?: boolean;
  direct_wss_available?: boolean;
  ws_url?: string;
  error_code?: string | null;
  user_id?: string;
  connection_id?: string | null;
  conversation_id?: string | null;
  selected_target_type?: string;
  /** Compatibility-only while the platform terminal API still accepts workspace_id. */
  workspace_id?: string;
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

export type TerminalBridgeOptions = {
  /** Exact registered runtime connection when one has already been selected. */
  connectionId?: string | null;
  /** Conversation that owns/uses the terminal session. */
  conversationId?: string | null;
  /**
   * Transitional compatibility only. Workspace may be sent to older APIs as a hint,
   * but it must never determine connection identity or execution authority.
   */
  workspaceId?: string | null;
  targetType?: TerminalLaneTarget;
  onOutputLine?: (line: string) => void;
};

function appendRuntimeContext(
  params: URLSearchParams,
  options: TerminalBridgeOptions | undefined,
): URLSearchParams {
  if (options?.connectionId) params.set('connection_id', options.connectionId);
  if (options?.conversationId) params.set('conversation_id', options.conversationId);
  if (options?.workspaceId) params.set('workspace_id', options.workspaceId);
  return params;
}

/**
 * Terminal bridge for config probes, one-shot exec, and optional PTY WebSocket.
 *
 * Context rules:
 * - targetType is a user preference/capability choice, not proof of a live connection.
 * - connectionId identifies the exact registered runtime connection when known.
 * - conversationId associates a PTY/session with a conversation.
 * - workspaceId is compatibility metadata only and is never used to choose a connection.
 * - pty_client is a per-browser identifier, not a user, lane, or terminal session id.
 */
export function useTerminalBridge(options?: TerminalBridgeOptions) {
  const initialTarget = options?.targetType ?? readPreferredTerminalLane() ?? DEFAULT_TERMINAL_LANE;
  const [targetType, setTargetType] = useState<TerminalLaneTarget>(initialTarget);
  const [localConnectionActive, setLocalConnectionActive] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const [state, setState] = useState<TerminalBridgeState>({
    config: null,
    connected: false,
    connecting: false,
    authRequired: false,
    lastError: null,
    targetType: initialTarget,
    localConnectionActive: false,
  });

  const runtimeContextKey = useMemo(
    () => `${options?.connectionId || ''}|${options?.conversationId || ''}|${options?.workspaceId || ''}`,
    [options?.connectionId, options?.conversationId, options?.workspaceId],
  );

  const appendLine = useCallback(
    (line: string) => {
      options?.onOutputLine?.(line);
    },
    [options?.onOutputLine],
  );

  const refreshLocalLane = useCallback(async () => {
    // The current platform endpoint is still workspace-aware. Treat that value only
    // as backward-compatible request metadata; connection health comes from the response.
    const local = await fetchLocalTerminalConnection(options?.workspaceId);
    const active = local?.connection?.is_active === true;
    setLocalConnectionActive(active);
    setState((s) => ({ ...s, localConnectionActive: active }));
    return active;
  }, [options?.workspaceId]);

  const setLane = useCallback((lane: TerminalLaneTarget) => {
    // This persists a preference only. It does not mark a connection healthy/connected.
    setTargetType(lane);
    persistPreferredTerminalLane(lane);
    setState((s) => ({ ...s, targetType: lane }));
  }, []);

  const refreshConfig = useCallback(async () => {
    const params = appendRuntimeContext(new URLSearchParams(), options);
    params.set('target_type', targetType);

    const suffix = params.toString();
    const res = await apiFetch<TerminalConfigStatus>(
      `/api/agent/terminal/config-status${suffix ? `?${suffix}` : ''}`,
    );
    if ('error' in res) {
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
  }, [localConnectionActive, runtimeContextKey, targetType]);

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
      appendLine('[terminal] Not enabled — connect a machine or select an available runtime connection.');
      return false;
    }

    const params = appendRuntimeContext(new URLSearchParams(), options);
    params.set('target_type', targetType);
    params.set('execution_mode', 'pty');
    params.set('pty_client', getOrCreatePtyClientId());

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
        appendLine('[terminal] WebSocket error — check the selected connection and try again.');
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
  }, [appendLine, refreshConfig, runtimeContextKey, targetType]);

  const execCommand = useCallback(
    async (command: string) => {
      const params = appendRuntimeContext(new URLSearchParams(), options);
      const suffix = params.toString();
      appendLine(`% ${command}`);

      const res = await apiFetch<{
        output?: string;
        stdout?: string;
        stderr?: string;
        exit_code?: number;
        execution_id?: string;
        connection_id?: string;
        target_type?: string;
        cwd?: string;
      }>(`/api/agent/terminal/exec${suffix ? `?${suffix}` : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command,
          target_type: targetType,
          execution_mode: 'batch_exec',
          connection_id: options?.connectionId || undefined,
          conversation_id: options?.conversationId || undefined,
        }),
      });

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
    [appendLine, runtimeContextKey, targetType],
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
    // Explicit target wins. Otherwise restore only the user's preference; do not
    // silently switch lanes because a workspace or prior connection happens to exist.
    const next = options?.targetType ?? readPreferredTerminalLane() ?? DEFAULT_TERMINAL_LANE;
    setTargetType(next);
    setState((s) => ({ ...s, targetType: next }));
    void refreshLocalLane();
    return disconnect;
  }, [disconnect, options?.targetType, refreshLocalLane, runtimeContextKey]);

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
