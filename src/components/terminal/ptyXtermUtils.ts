import type { Terminal } from '@xterm/xterm';
import type { FitAddon } from '@xterm/addon-fit';

export type TerminalConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'backend_unavailable'
  | 'auth_failed'
  | 'offline';

export type XtermPaneProps = {
  workspaceId?: string | null;
  targetType?: string;
  visible?: boolean;
  connectEnabled?: boolean;
  onConnectionChange?: (status: TerminalConnectionStatus) => void;
  onSessionIdChange?: (sessionId: string | null) => void;
  className?: string;
};

export function closeSocketQuietly(ws: WebSocket | null) {
  if (!ws) return;
  try {
    ws.close();
  } catch {
    /* ignore */
  }
}

export function fitTerminalDimensions(
  term: Terminal,
  fitAddon: FitAddon,
  container: HTMLElement,
) {
  if (!container.offsetParent && container.clientHeight < 2) return;
  try {
    fitAddon.fit();
    term.resize(fitAddon.proposeDimensions()?.cols ?? term.cols, fitAddon.proposeDimensions()?.rows ?? term.rows);
  } catch {
    /* ignore */
  }
}

export function normalizePtyEnterInput(data: string): string {
  if (data === '\r') return '\r';
  if (data === '\n') return '\r';
  return data;
}
