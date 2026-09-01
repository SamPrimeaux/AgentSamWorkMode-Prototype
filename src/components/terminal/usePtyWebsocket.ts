import { useCallback, useEffect, useRef, useState } from 'react';
import type { Terminal } from '@xterm/xterm';
import type { FitAddon } from '@xterm/addon-fit';
import { getOrCreatePtyClientId } from '../../lib/ptyClientId';
import { getWorkspaceId } from '../../lib/apiClient';
import {
  closeSocketQuietly,
  fitTerminalDimensions,
  normalizePtyEnterInput,
  type TerminalConnectionStatus,
  type XtermPaneProps,
} from './ptyXtermUtils';

export function usePtyWebsocket({
  workspaceId,
  targetType = 'user_hosted_tunnel',
  visible = true,
  connectEnabled = true,
  onConnectionChange,
  onSessionIdChange,
  xtermRef,
  fitAddonRef,
  terminalRef,
  preferBridge = false,
  autoConnect = true,
}: XtermPaneProps & {
  xtermRef: React.RefObject<Terminal | null>;
  fitAddonRef: React.RefObject<FitAddon | null>;
  terminalRef: React.RefObject<HTMLDivElement | null>;
  preferBridge?: boolean;
  autoConnect?: boolean;
}) {
  const socketRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<TerminalConnectionStatus>('disconnected');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const intentionalCloseRef = useRef(false);
  const connectSeqRef = useRef(0);
  const disposeTermRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    onConnectionChange?.(status);
  }, [onConnectionChange, status]);

  useEffect(() => {
    onSessionIdChange?.(sessionId);
  }, [onSessionIdChange, sessionId]);

  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true;
    connectSeqRef.current += 1;
    disposeTermRef.current?.();
    disposeTermRef.current = undefined;
    closeSocketQuietly(socketRef.current);
    socketRef.current = null;
    setSessionId(null);
    setStatus('disconnected');
  }, []);

  const openSocket = useCallback(
    (seq: number, wsUrl: string, laneLabel: string) => {
      closeSocketQuietly(socketRef.current);
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      const attach = (term: Terminal) => {
        term.clear();
        if (fitAddonRef.current && terminalRef.current) {
          fitTerminalDimensions(term, fitAddonRef.current, terminalRef.current);
        }
        const onData = term.onData((data) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const payload = normalizePtyEnterInput(data);
          if (payload.endsWith('\r')) {
            const cmd = payload.replace(/\r+$/, '').trim();
            if (cmd.startsWith('/')) {
              ws.send(JSON.stringify({ type: 'slash', line: cmd }));
              return;
            }
          }
          ws.send(payload);
        });
        const onResize = term.onResize(({ cols, rows }) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          ws.send(JSON.stringify({ type: 'resize', cols, rows }));
        });
        term.writeln(`\x1b[38;5;82m  ◈ Connected (${laneLabel})\x1b[0m`);
        return () => {
          onData.dispose();
          onResize.dispose();
        };
      };

      ws.onopen = () => {
        if (seq !== connectSeqRef.current) return;
        setStatus('connecting');
        const term = xtermRef.current;
        if (term) disposeTermRef.current = attach(term);
      };

      ws.onmessage = (event) => {
        if (seq !== connectSeqRef.current) return;
        const term = xtermRef.current;
        if (!term) return;
        try {
          const msg = JSON.parse(String(event.data)) as {
            type?: string;
            data?: string;
            status?: string;
            session_id?: string;
          };
          if (msg.type === 'session_id' && msg.session_id) {
            setSessionId(msg.session_id);
            return;
          }
          if (msg.type === 'state') {
            if (msg.status === 'connected') setStatus('connected');
            if (msg.status === 'auth_failed') setStatus('auth_failed');
            if (msg.status === 'backend_unavailable') setStatus('backend_unavailable');
            return;
          }
          if (msg.type === 'output' && msg.data) {
            term.write(msg.data);
            return;
          }
        } catch {
          term.write(String(event.data));
        }
      };

      ws.onerror = () => {
        if (seq !== connectSeqRef.current) return;
        setStatus('offline');
      };

      ws.onclose = (ev) => {
        if (seq !== connectSeqRef.current) return;
        disposeTermRef.current?.();
        disposeTermRef.current = undefined;
        if (intentionalCloseRef.current) return;
        if (ev.code === 4401) setStatus('auth_failed');
        else if (ev.code === 4503) setStatus('backend_unavailable');
        else setStatus('disconnected');
      };
    },
    [fitAddonRef, terminalRef, xtermRef],
  );

  const connect = useCallback(async () => {
    if (!connectEnabled || !visible) return;
    intentionalCloseRef.current = false;
    const seq = ++connectSeqRef.current;
    const wsId = (workspaceId || getWorkspaceId() || 'dev_workspace').trim();
    setStatus('connecting');

    if (preferBridge) {
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      openSocket(seq, `${proto}://${window.location.host}/api/bridge/terminal`, 'local bridge');
      return;
    }

    let useIam = true;
    try {
      const cfgUrl = new URL('/api/agent/terminal/config-status', window.location.origin);
      cfgUrl.searchParams.set('workspace_id', wsId);
      cfgUrl.searchParams.set('target_type', targetType);
      const res = await fetch(cfgUrl.toString(), { credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      useIam = res.ok && json.terminal_configured !== false;
    } catch {
      useIam = false;
    }

    if (seq !== connectSeqRef.current) return;

    if (!useIam) {
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      openSocket(seq, `${proto}://${window.location.host}/api/bridge/terminal`, 'local bridge');
      return;
    }

    const wsHttpUrl = new URL('/api/agent/terminal/ws', window.location.origin);
    wsHttpUrl.searchParams.set('workspace_id', wsId);
    wsHttpUrl.searchParams.set('execution_mode', 'pty');
    wsHttpUrl.searchParams.set('target_type', targetType);
    wsHttpUrl.searchParams.set('pty_client', getOrCreatePtyClientId());
    const wsUrl = wsHttpUrl.href.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');
    openSocket(seq, wsUrl, targetType);
  }, [connectEnabled, openSocket, preferBridge, targetType, visible, workspaceId]);

  useEffect(() => {
    if (!autoConnect) return;
    if (!visible || !connectEnabled) {
      disconnect();
      return;
    }
    void connect();
    return () => disconnect();
  }, [autoConnect, connect, connectEnabled, disconnect, targetType, visible, workspaceId, preferBridge]);

  return { status, sessionId, disconnect, reconnect: connect };
}
