import React, { useCallback, useState } from 'react';
import { X } from 'lucide-react';
import type { WorkbenchPullRequest } from '../../types';
import { cn } from '../../lib/utils';
import { IOS_CLASSES, IOS_TYPE } from '../../lib/workdiff/iosMetrics';
import { fileKey } from '../../lib/workdiff/interactions';
import { WorkDiffFileRow } from './WorkDiffFileRow';
import { WorkDiffFileDiffBlock } from './WorkDiffFileDiffBlock';

type WorkDiffChangesSheetProps = {
  isOpen: boolean;
  pr: WorkbenchPullRequest;
  onClose: () => void;
  onViewPr?: () => void;
};

/**
 * iOS-style bottom sheet: file inventory + accordion diffs (zone: changes_sheet).
 */
export const WorkDiffChangesSheet: React.FC<WorkDiffChangesSheetProps> = ({
  isOpen,
  pr,
  onClose,
  onViewPr,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleFile = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedIds(new Set(pr.files.map(fileKey)));
  }, [pr.files]);

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  const allExpanded = expandedIds.size === pr.files.length;

  const handleCopyPath = (path: string) => {
    void navigator.clipboard?.writeText(path);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Changes"
      data-zone="changes_sheet"
    >
      <button
        type="button"
        className="flex-1 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Dismiss changes"
      />

      <div
        className={cn(
          'w-full max-h-[92vh] flex flex-col bg-[#1c1c1e] border-t border-white/10',
          'rounded-t-[20px] shadow-2xl animate-in slide-in-from-bottom duration-300',
        )}
      >
        {/* Grabber */}
        <div className="w-full pt-2 pb-1 flex justify-center shrink-0">
          <div className="w-9 h-[5px] rounded-full bg-white/25" />
        </div>

        {/* Header */}
        <header
          className={cn(
            'px-4 pb-3 flex items-center justify-between shrink-0 border-b border-white/[0.06]',
            IOS_CLASSES.safeTop,
          )}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={cn(
              'rounded-full bg-white/[0.08] text-white/80 hover:bg-white/[0.14]',
              IOS_CLASSES.touchMin,
              'flex items-center justify-center',
            )}
          >
            <X size={18} />
          </button>

          <h2 className={cn('text-white', IOS_TYPE.headline)}>Changes</h2>

          {onViewPr ? (
            <button
              type="button"
              onClick={onViewPr}
              className={cn(
                'px-3.5 rounded-full bg-white/[0.1] text-white text-[15px] font-medium',
                'min-h-[36px] touch-manipulation active:scale-[0.97]',
              )}
            >
              View PR
            </button>
          ) : (
            <span className="w-11" aria-hidden />
          )}
        </header>

        {/* Subheader */}
        <div className="px-4 py-2 flex items-center justify-between shrink-0">
          <span className={cn('text-white/45', IOS_TYPE.subhead)}>
            {pr.files.length} Files
          </span>
          <button
            type="button"
            onClick={allExpanded ? collapseAll : expandAll}
            className={cn('text-white/45 hover:text-white/70', IOS_TYPE.subhead, 'min-h-[44px] px-2')}
          >
            {allExpanded ? 'Collapse All' : 'Expand All'}
          </button>
        </div>

        {/* File list */}
        <div className={cn('flex-1 overflow-y-auto overscroll-contain', IOS_CLASSES.safeBottom)}>
          {pr.files.map((file) => {
            const id = fileKey(file);
            const expanded = expandedIds.has(id);
            return (
              <div key={id}>
                <WorkDiffFileRow
                  file={file}
                  expanded={expanded}
                  onToggle={() => toggleFile(id)}
                  onMenu={() => handleCopyPath(file.path)}
                />
                {expanded && <WorkDiffFileDiffBlock file={file} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
