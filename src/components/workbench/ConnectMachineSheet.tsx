import React, { useEffect } from 'react';
import { X, Laptop, Terminal, Shield } from 'lucide-react';
import { DevicePairingPanel } from './DevicePairingPanel';
import { TerminalLaneSelector, targetToExecutionLane } from '../terminal/TerminalLaneSelector';
import { executionLaneToTarget } from '../../lib/terminal/terminalLane';
import { useDevicePairing } from '../../hooks/useDevicePairing';
import type { TerminalLaneTarget } from '../../lib/terminal/pairingTypes';

export type ConnectMachineSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  workspaceId?: string | null;
  currentLane: TerminalLaneTarget;
  localConnectionActive?: boolean;
  onChangeLane: (lane: TerminalLaneTarget) => void;
  onPaired?: () => void;
};

export const ConnectMachineSheet: React.FC<ConnectMachineSheetProps> = ({
  isOpen,
  onClose,
  workspaceId,
  currentLane,
  localConnectionActive,
  onChangeLane,
  onPaired,
}) => {
  const pairing = useDevicePairing(workspaceId);
  const executionLane = targetToExecutionLane(currentLane);

  useEffect(() => {
    if (pairing.isPaired) onPaired?.();
  }, [onPaired, pairing.isPaired]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="flex-1 w-full" onClick={onClose} aria-hidden />

      <div className="w-full max-w-lg mx-auto rounded-t-[32px] bg-[#0d0d10] border-t border-x border-white/10 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
        <div className="px-6 py-4 flex items-center justify-between border-b border-white/[0.07] shrink-0">
          <div className="flex items-center gap-2">
            <Laptop size={18} className="text-emerald-400" />
            <div>
              <h3 className="text-sm font-semibold text-white">Connect your dev machine</h3>
              <p className="text-[11px] text-white/40">Pairing code · agentsam-bridge CLI</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white/80 flex items-center justify-center"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <TerminalLaneSelector
            currentLane={executionLane}
            localConnectionActive={localConnectionActive || pairing.isLocalConnectionActive}
            onChangeLane={(lane) => onChangeLane(executionLaneToTarget(lane))}
          />

          <DevicePairingPanel
            code={pairing.code}
            cliCommand={pairing.cliCommand}
            status={pairing.status}
            expiresAt={pairing.expiresAt}
            deviceName={pairing.deviceName}
            platform={pairing.platform}
            loading={pairing.loading}
            error={pairing.error}
            onStart={() => void pairing.beginPairing()}
            onCancel={() => void pairing.cancelPairing()}
            onRefresh={() => {
              if (pairing.pairId) void pairing.refreshLocalConnection();
            }}
          />

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-white/70">
              <Shield size={14} className="text-blue-400" />
              <span>What gets installed locally</span>
            </div>
            <ul className="text-xs text-white/50 space-y-1.5 list-disc pl-4 leading-relaxed">
              <li>
                <code className="text-emerald-300/90">agentsam-bridge</code> — thin CLI (pair, run, status)
              </li>
              <li>PTY server on port 3099 (ExecOS-compatible)</li>
              <li>Optional <code className="text-white/60">cloudflared</code> tunnel to your zone</li>
              <li>
                <strong className="text-white/70">Never</strong> ships{' '}
                <code className="text-rose-300/80">AGENTSAM_BRIDGE_KEY</code> — only your per-device token
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-dashed border-white/10 p-4 text-xs text-white/45 leading-relaxed">
            <div className="flex items-center gap-2 text-white/60 font-semibold mb-1">
              <Terminal size={13} />
              Quick start
            </div>
            <p>
              After pairing, the CLI writes <code className="text-white/70">~/.agentsam/bridge.env</code> and starts
              the bridge. Work Mode defaults to <code className="text-emerald-300/90">user_hosted_tunnel</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
