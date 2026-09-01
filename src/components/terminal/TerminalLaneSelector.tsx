import React from 'react';
import { Cloud, Container, Laptop, Check, Link2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ExecutionLane } from '../../types';
import {
  executionLaneToTarget,
  targetToExecutionLane,
} from '../../lib/terminal/terminalLane';
import type { TerminalLaneTarget } from '../../lib/terminal/pairingTypes';

interface TerminalLaneSelectorProps {
  currentLane: ExecutionLane;
  onChangeLane: (lane: ExecutionLane) => void;
  className?: string;
  isCompact?: boolean;
  localConnectionActive?: boolean;
  onConnectMachine?: () => void;
}

const LANES: {
  id: ExecutionLane;
  apiTarget: TerminalLaneTarget;
  label: string;
  sublabel: string;
  port?: string;
  icon: React.ElementType;
}[] = [
  {
    id: 'local_exc',
    apiTarget: 'user_hosted_tunnel',
    label: 'Your machine',
    sublabel: 'user_hosted_tunnel · localhost / Docker / CF tunnel',
    port: ':3099',
    icon: Laptop,
  },
  {
    id: 'gcp_vm',
    apiTarget: 'platform_vm',
    label: 'Cloud VM',
    sublabel: 'Platform VPC shell',
    icon: Cloud,
  },
  {
    id: 'cloud_sandbox',
    apiTarget: 'sandbox',
    label: 'Sandbox',
    sublabel: 'Isolated container',
    icon: Container,
  },
];

export const TerminalLaneSelector: React.FC<TerminalLaneSelectorProps> = ({
  currentLane,
  onChangeLane,
  className,
  isCompact = false,
  localConnectionActive,
  onConnectMachine,
}) => {
  const apiTarget = executionLaneToTarget(currentLane);
  const showConnect =
    apiTarget === 'user_hosted_tunnel' && !localConnectionActive && onConnectMachine;

  return (
    <div className={cn('relative inline-flex flex-col gap-1', className)}>
      {showConnect && !isCompact && (
        <button
          type="button"
          onClick={onConnectMachine}
          className="self-end text-[10px] text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
        >
          <Link2 size={11} />
          Pair machine
        </button>
      )}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono">
        {LANES.map((lane) => {
          const Icon = lane.icon;
          const isSelected = lane.id === currentLane;
          const isLive = lane.apiTarget === 'user_hosted_tunnel' && localConnectionActive && isSelected;
          return (
            <button
              key={lane.id}
              type="button"
              onClick={() => onChangeLane(lane.id)}
              className={cn(
                'px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5',
                isSelected
                  ? 'bg-zinc-800 text-white font-semibold shadow-xs border border-zinc-700/60'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40',
              )}
              title={`${lane.label} — ${lane.sublabel}`}
            >
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  isLive ? 'bg-emerald-400 animate-pulse' : isSelected ? 'bg-emerald-500/60' : 'bg-zinc-500',
                )}
              />
              <Icon size={12} className={isSelected ? 'text-emerald-400' : 'text-zinc-400'} />
              <span className="truncate">{lane.label}</span>
              {lane.port && !isCompact && (
                <span className="text-[10px] text-zinc-500 hidden sm:inline">{lane.port}</span>
              )}
              {isSelected && <Check size={11} className="text-emerald-400 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export { executionLaneToTarget, targetToExecutionLane };
