/** Custom events shared with AgentSamRemix dashboard shell. */
export const IAM_TERMINAL_CONNECT = 'iam-terminal-connect';
export const IAM_TERMINAL_CONFIGURE = 'iam-terminal-configure';
export const IAM_OPEN_COMMAND_PALETTE = 'iam-open-command-palette';

export type TerminalConnectDetail = {
  target?: 'local' | 'cloud' | 'sandbox' | 'platform_vm';
  command?: string;
};

export function dispatchTerminalConnect(detail: TerminalConnectDetail = { target: 'local' }): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(IAM_TERMINAL_CONNECT, { detail }));
}
