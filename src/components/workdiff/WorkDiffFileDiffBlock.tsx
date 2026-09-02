import React from 'react';
import type { WorkbenchChangedFile } from '../../types';
import { cn } from '../../lib/utils';
import { IOS_TYPE } from '../../lib/workdiff/iosMetrics';

type WorkDiffFileDiffBlockProps = {
  file: WorkbenchChangedFile;
  className?: string;
};

/**
 * Read-only mobile diff renderer — no Monaco/CodeMirror.
 * Optimized for review: line numbers, add/del/context coloring, horizontal scroll.
 */
export const WorkDiffFileDiffBlock: React.FC<WorkDiffFileDiffBlockProps> = ({
  file,
  className,
}) => {
  const isAllAdditions =
    file.deletions === 0 && file.diffLines.every((l) => l.type === 'add' || l.type === 'header');

  return (
    <div
      className={cn(
        'border-t border-white/[0.06] bg-[#0a0a0c] overflow-x-auto',
        className,
      )}
      data-zone="file_expand"
    >
      <div className="px-3 py-2 border-b border-white/[0.05] flex items-center justify-between">
        <span className={cn('text-white/40 truncate', IOS_TYPE.caption1)}>{file.path}</span>
        {isAllAdditions && (
          <span className="shrink-0 ml-2 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold">
            New
          </span>
        )}
      </div>

      <pre className="p-3 font-mono text-[13px] leading-[20px] selection:bg-emerald-500/25">
        {file.diffLines.map((line, idx) => {
          const isAdd = line.type === 'add';
          const isDel = line.type === 'del';
          const isHeader = line.type === 'header';

          return (
            <div
              key={idx}
              className={cn(
                'flex rounded-sm',
                isAdd && 'bg-emerald-950/50 text-emerald-200',
                isDel && 'bg-rose-950/40 text-rose-300 line-through opacity-90',
                isHeader && 'bg-blue-950/30 text-blue-300/80 my-1 py-1',
                !isAdd && !isDel && !isHeader && 'text-white/75',
              )}
            >
              <span className="w-9 shrink-0 text-right pr-2 text-[11px] text-white/25 select-none tabular-nums">
                {line.newLine ?? line.oldLine ?? ''}
              </span>
              <span
                className={cn(
                  'w-4 shrink-0 font-bold select-none',
                  isAdd && 'text-emerald-400',
                  isDel && 'text-rose-400',
                )}
              >
                {isAdd ? '+' : isDel ? '-' : isHeader ? '@' : ' '}
              </span>
              <code className="flex-1 whitespace-pre-wrap break-words">
                {line.content.replace(/^[-+@]{1,2}\s?/, '')}
              </code>
            </div>
          );
        })}
      </pre>
    </div>
  );
};
