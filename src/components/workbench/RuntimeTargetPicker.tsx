import React from 'react';
import { Cloud, Container, Download, Check } from 'lucide-react';
import { RuntimeTarget, RUNTIME_TARGET_OPTIONS } from '../../types.runtime-target';
import { cn } from '../../lib/utils';

interface RuntimeTargetPickerProps {
  currentTarget: RuntimeTarget;
  onChangeTarget: (target: RuntimeTarget) => void;
  className?: string;
}

const ICONS: Record<RuntimeTarget, React.ElementType> = {
  cloudflare_workers: Cloud,
  docker_local: Container,
  static_export: Download,
};

/**
 * "Where does this live?" picker — visually matches TerminalLaneSelector's
 * pill-row pattern so picking a deploy target feels like the same UI language
 * as picking an execution lane.
 */
export const RuntimeTargetPicker: React.FC<RuntimeTargetPickerProps> = ({
  currentTarget,
  onChangeTarget,
  className,
}) => {
  return (
    <div className={cn('relative inline-block', className)}>
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono">
        {RUNTIME_TARGET_OPTIONS.map((opt) => {
          const Icon = ICONS[opt.id];
          const isSelected = opt.id === currentTarget;
          return (
            <button
              key={opt.id}
              onClick={() => onChangeTarget(opt.id)}
              disabled={opt.status === 'coming_soon'}
              className={cn(
                'px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed',
                isSelected
                  ? 'bg-zinc-800 text-white font-semibold shadow-xs border border-zinc-700/60'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40',
              )}
              title={`${opt.label} — ${opt.sublabel}`}
            >
              <Icon size={12} className={isSelected ? 'text-blue-400' : 'text-zinc-400'} />
              <span className="truncate">{opt.label}</span>
              {isSelected && <Check size={11} className="text-emerald-400" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
