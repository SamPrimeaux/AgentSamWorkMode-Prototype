import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { cn } from '../../lib/utils';
import { usePtyWebsocket } from './usePtyWebsocket';
import type { TerminalConnectionStatus, XtermPaneProps } from './ptyXtermUtils';

export type { TerminalConnectionStatus };

export const XtermPane: React.FC<XtermPaneProps & { preferBridge?: boolean }> = ({
  workspaceId,
  targetType = 'user_hosted_tunnel',
  visible = true,
  connectEnabled = true,
  onConnectionChange,
  onSessionIdChange,
  className,
  preferBridge = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const { status, reconnect } = usePtyWebsocket({
    workspaceId,
    targetType,
    visible,
    connectEnabled,
    onConnectionChange,
    onSessionIdChange,
    preferBridge,
    autoConnect: false,
    xtermRef,
    fitAddonRef,
    terminalRef: containerRef,
  });

  useEffect(() => {
    if (!containerRef.current || xtermRef.current) return;
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      theme: {
        background: '#09090b',
        foreground: '#e4e4e7',
        cursor: '#34d399',
        selectionBackground: 'rgba(52, 211, 153, 0.25)',
      },
      scrollback: 5000,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    fit.fit();
    xtermRef.current = term;
    fitAddonRef.current = fit;

    const ro = new ResizeObserver(() => {
      if (fitAddonRef.current && containerRef.current && xtermRef.current) {
        try {
          fitAddonRef.current.fit();
        } catch {
          /* ignore */
        }
      }
    });
    ro.observe(containerRef.current);

    void reconnect();

    return () => {
      ro.disconnect();
      term.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, [reconnect]);

  return (
    <div className={cn('relative h-full min-h-[200px] flex flex-col', className)}>
      <div className="absolute top-2 right-2 z-10 text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900/90 border border-zinc-700 text-zinc-400">
        {status}
      </div>
      <div ref={containerRef} className="flex-1 min-h-0 w-full p-1" />
    </div>
  );
};
