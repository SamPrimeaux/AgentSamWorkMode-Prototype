import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { WorkbenchChangedFile } from '../../types';
import { cn } from '../../lib/utils';
import { IOS_CLASSES, IOS_TYPE } from '../../lib/workdiff/iosMetrics';
import {
  fileKindFromName,
  fileKindIcon,
  fileKindLabel,
  parentDirHint,
  truncateFilename,
} from '../../lib/workdiff/filePresentation';

type WorkDiffFileRowProps = {
  file: WorkbenchChangedFile;
  expanded: boolean;
  onToggle: () => void;
  onMenu?: () => void;
  showChevron?: boolean;
  className?: string;
};

export const WorkDiffFileRow: React.FC<WorkDiffFileRowProps> = ({
  file,
  expanded,
  onToggle,
  onMenu,
  showChevron = true,
  className,
}) => {
  const kind = fileKindFromName(file.filename);
  const Icon = fileKindIcon(kind);
  const dirHint = parentDirHint(file.path);

  return (
    <div
      className={cn(
        'flex items-center border-b border-white/[0.06] last:border-b-0',
        className,
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={cn(
          'flex-1 flex items-center gap-2.5 px-4 text-left',
          IOS_CLASSES.touchRow,
        )}
      >
        {showChevron && (
          <ChevronRight
            size={14}
            className={cn(
              'shrink-0 text-white/35 transition-transform duration-200',
              expanded && 'rotate-90',
            )}
          />
        )}

        <span
          className={cn(
            'shrink-0 w-6 text-center text-[11px] font-semibold text-white/45',
            IOS_TYPE.caption2,
          )}
          aria-hidden
        >
          {fileKindLabel(kind)}
        </span>

        <Icon size={15} className="shrink-0 text-white/40" aria-hidden />

        <div className="flex-1 min-w-0">
          <span className={cn('text-white block truncate', IOS_TYPE.monoFile)}>
            {truncateFilename(file.filename)}
          </span>
          {dirHint && (
            <span className={cn('text-white/35 block truncate', IOS_TYPE.caption2)}>
              {dirHint}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 font-mono tabular-nums">
          <span className="text-[13px] text-emerald-400">+{file.additions}</span>
          <span className="text-[13px] text-rose-400">-{file.deletions}</span>
        </div>
      </button>

      {onMenu && (
        <button
          type="button"
          onClick={onMenu}
          aria-label={`Options for ${file.filename}`}
          className={cn(
            'shrink-0 mr-2 rounded-full text-white/40 hover:text-white/70 hover:bg-white/[0.06]',
            IOS_CLASSES.touchMin,
            'flex items-center justify-center',
          )}
        >
          <span className="text-lg leading-none tracking-widest">···</span>
        </button>
      )}
    </div>
  );
};
