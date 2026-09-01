import { useCallback } from 'react';
import { dispatchTerminalConnect } from '../lib/openCommandPalette';

/** Opens the dashboard shell terminal (when embedded) or signals local lane connect. */
export function useShellBridge() {
  const openShellTerminal = useCallback((target: 'local' | 'platform_vm' | 'sandbox' = 'local') => {
    dispatchTerminalConnect({ target });
  }, []);

  const runInShellTerminal = useCallback((command: string, target: 'local' | 'platform_vm' = 'local') => {
    dispatchTerminalConnect({ target, command });
  }, []);

  return { openShellTerminal, runInShellTerminal };
}
