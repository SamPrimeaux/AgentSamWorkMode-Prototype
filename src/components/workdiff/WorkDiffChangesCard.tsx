import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { WorkbenchPullRequest } from '../../types';
import { cn } from '../../lib/utils';
import { IOS_CLASSES, IOS_TYPE } from '../../lib/workdiff/iosMetrics';
import { fileKindFromName, fileKindLabel, truncateFilename } from '../../lib/workdiff/filePresentation';

type WorkDiffChangesCardProps = {
  pr: WorkbenchPullRequest;
  maxVisibleFiles?: number;
  onOpenSheet: () => void;
  className?: string;
};

/**
 * Compressed Changes card for the chat thread (interaction zone: changes_card).
 */
export const WorkDiffChangesCard: React.FC<WorkDiffChangesCardProps> = ({
  pr,
  maxVisibleFiles = 5,
  onOpenSheet,
  className,
}) => {
  const visible = pr.files.slice(0, maxVisibleFiles);
  const hidden = pr.files.length - visible.length;

  return (
    <button
      type="button"
      onClick={onOpenSheet}
      data-zone="changes_card"
      className={cn(
        'w-full text-left rounded-2xl bg-white/[0.05] border border-white/[0.08]',
        'hover:bg-white/[0.07] active:bg-white/[0.09] transition-colors',
        'p-4 space-y-3 touch-manipulation',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={cn('text-white', IOS_TYPE.headline)}>Changes</span>
          <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/80 font-mono text-xs font-medium">
            {pr.files.length}
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs tabular-nums">
          <span className="text-emerald-400">+{pr.additions}</span>
          <span className="text-rose-400">-{pr.deletions}</span>
          <ChevronRight size={16} className="text-white/35" />
        </div>
      </div>

      <div className="space-y-1">
        {visible.map((file) => (
          <div
            key={file.id}
            className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-xl bg-white/[0.03]"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-semibold text-white/40 w-5 text-center shrink-0">
                {fileKindLabel(fileKindFromName(file.filename))}
              </span>
              <span className={cn('text-white/85 truncate', IOS_TYPE.caption1, 'font-mono')}>
                {truncateFilename(file.filename, 22)}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0 font-mono text-[11px] tabular-nums">
              <span className="text-emerald-400">+{file.additions}</span>
              <span className="text-rose-400">-{file.deletions}</span>
            </div>
          </div>
        ))}
        {hidden > 0 && (
          <p className={cn('text-white/40 px-2 pt-1', IOS_TYPE.caption1)}>… {hidden} more</p>
        )}
      </div>
    </button>
  );
};
