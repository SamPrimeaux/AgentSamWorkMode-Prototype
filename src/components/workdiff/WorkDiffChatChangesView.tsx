import React, { useState } from 'react';
import {
  ChevronLeft,
  GitBranch,
  MoreHorizontal,
  Mic,
  Plus,
} from 'lucide-react';
import type { WorkDiffSession, WorkDiffViewState } from '../../lib/workdiff/interactions';
import { cn } from '../../lib/utils';
import { IOS_CLASSES, IOS_TYPE } from '../../lib/workdiff/iosMetrics';
import { WorkDiffChangesCard } from './WorkDiffChangesCard';
import { WorkDiffChangesSheet } from './WorkDiffChangesSheet';
import { WorkDiffPrOverview } from './WorkDiffPrOverview';

export type WorkDiffChatChangesViewProps = {
  session: WorkDiffSession;
  title?: string;
  onBack?: () => void;
  onFollowUp?: (message: string) => void;
  onSquashAndMerge?: () => void;
  className?: string;
};

/**
 * Mobile-first post-agent review surface.
 *
 * Interaction flow:
 *   chat_thread → changes_card → changes_sheet → file_expand
 *   primary_actions → pr_overview → pr_tab_*
 */
export const WorkDiffChatChangesView: React.FC<WorkDiffChatChangesViewProps> = ({
  session,
  title = 'Cloudflare Cursor details',
  onBack,
  onFollowUp,
  onSquashAndMerge,
  className,
}) => {
  const [view, setView] = useState<WorkDiffViewState>('chat_with_changes');
  const [followUp, setFollowUp] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);

  const openSheet = () => {
    setSheetOpen(true);
    setView('changes_sheet');
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setView('chat_with_changes');
  };

  const openPr = () => {
    setSheetOpen(false);
    setView('pr_overview');
  };

  const handleSubmitFollowUp = () => {
    const text = followUp.trim();
    if (!text || !onFollowUp) return;
    onFollowUp(text);
    setFollowUp('');
  };

  return (
    <div
      className={cn(
        'flex flex-col h-full min-h-0 bg-[#000000] text-white',
        className,
      )}
    >
      {/* Navigation header */}
      <header
        className={cn(
          'shrink-0 px-2 pb-2 flex items-center justify-between border-b border-white/[0.06]',
          IOS_CLASSES.safeTop,
        )}
      >
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className={cn(
              'rounded-full hover:bg-white/[0.08]',
              IOS_CLASSES.touchMin,
              'flex items-center justify-center',
            )}
          >
            <ChevronLeft size={22} />
          </button>
        ) : (
          <span className="w-11" />
        )}

        <h1 className={cn('text-white truncate max-w-[60%] text-center', IOS_TYPE.headline)}>
          {title}
        </h1>

        <button
          type="button"
          aria-label="More"
          className={cn(
            'rounded-full hover:bg-white/[0.08]',
            IOS_CLASSES.touchMin,
            'flex items-center justify-center',
          )}
        >
          <MoreHorizontal size={18} className="text-white/70" />
        </button>
      </header>

      {/* Chat + changes scroll region */}
      <div
        className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4"
        data-zone="chat_thread"
      >
        <article className="space-y-3">
          <p className={cn('text-white/85', IOS_TYPE.body)}>{session.agentSummary}</p>
        </article>

        <WorkDiffChangesCard pr={session.pr} onOpenSheet={openSheet} />

        {/* Primary action pill */}
        <div data-zone="primary_actions" className="flex justify-center pt-1">
          <button
            type="button"
            onClick={openPr}
            className={cn(
              'inline-flex items-center gap-2 px-5 min-h-[44px] rounded-full',
              'bg-white/[0.08] border border-white/[0.12] text-white font-medium',
              'text-[15px] touch-manipulation active:scale-[0.97]',
            )}
          >
            <GitBranch size={16} className="text-purple-400" />
            View PR
          </button>
        </div>
      </div>

      {/* Follow-up composer */}
      <div
        data-zone="composer"
        className={cn(
          'shrink-0 px-3 pt-2 border-t border-white/[0.08] bg-[#0a0a0a]/90 backdrop-blur-md',
          IOS_CLASSES.safeBottom,
        )}
      >
        <div className="flex items-end gap-2 max-w-lg mx-auto pb-2">
          <button
            type="button"
            aria-label="Attach"
            className={cn(
              'shrink-0 rounded-full bg-white/[0.08] text-white/70',
              IOS_CLASSES.touchMin,
              'flex items-center justify-center',
            )}
          >
            <Plus size={20} />
          </button>

          <div className="flex-1 min-h-[44px] rounded-3xl bg-white/[0.08] border border-white/[0.1] flex items-center px-4">
            <input
              type="text"
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmitFollowUp()}
              placeholder="Follow up…"
              className={cn(
                'w-full bg-transparent outline-none text-white placeholder:text-white/35',
                IOS_TYPE.body,
              )}
            />
          </div>

          <button
            type="button"
            aria-label="Voice input"
            className={cn(
              'shrink-0 rounded-full text-white/50 hover:text-white/80',
              IOS_CLASSES.touchMin,
              'flex items-center justify-center',
            )}
          >
            <Mic size={20} />
          </button>
        </div>
      </div>

      {/* Layered surfaces */}
      <WorkDiffChangesSheet
        isOpen={sheetOpen}
        pr={session.pr}
        onClose={closeSheet}
        onViewPr={openPr}
      />

      {view === 'pr_overview' && (
        <WorkDiffPrOverview
          session={session}
          onBack={() => setView('chat_with_changes')}
          onOpenChangesSheet={() => {
            setView('changes_sheet');
            setSheetOpen(true);
          }}
          onSquashAndMerge={onSquashAndMerge}
          onOpenExternalPr={() => {
            if (session.externalPrUrl) window.open(session.externalPrUrl, '_blank', 'noopener');
          }}
        />
      )}
    </div>
  );
};
