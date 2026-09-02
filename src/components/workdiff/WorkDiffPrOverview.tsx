import React, { useState } from 'react';
import {
  ChevronLeft,
  GitBranch,
  Link2,
  MoreHorizontal,
  GitCommit,
  CheckCircle2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { WorkDiffPrTab, WorkDiffSession } from '../../lib/workdiff/interactions';
import { cn } from '../../lib/utils';
import { IOS_CLASSES, IOS_TYPE } from '../../lib/workdiff/iosMetrics';
import { WorkDiffChangesCard } from './WorkDiffChangesCard';

type WorkDiffPrOverviewProps = {
  session: WorkDiffSession;
  onBack: () => void;
  onOpenChangesSheet: () => void;
  onSquashAndMerge?: () => void;
  onOpenExternalPr?: () => void;
};

const TABS: { id: WorkDiffPrTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'discussion', label: 'Discussion' },
  { id: 'commits', label: 'Commits' },
];

export const WorkDiffPrOverview: React.FC<WorkDiffPrOverviewProps> = ({
  session,
  onBack,
  onOpenChangesSheet,
  onSquashAndMerge,
  onOpenExternalPr,
}) => {
  const { pr, commits, mergedAt, mergedBy } = session;
  const [tab, setTab] = useState<WorkDiffPrTab>('overview');
  const isMerged = pr.status === 'merged';

  return (
    <div
      className="fixed inset-0 z-[55] flex flex-col bg-[#000000] text-white overflow-hidden"
      data-zone="pr_overview"
    >
      {/* Nav bar */}
      <header
        className={cn(
          'shrink-0 px-2 pb-2 flex items-center justify-between border-b border-white/[0.08]',
          IOS_CLASSES.safeTop,
        )}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className={cn(
            'rounded-full hover:bg-white/[0.08]',
            IOS_CLASSES.touchMin,
            'flex items-center justify-center text-white/90',
          )}
        >
          <ChevronLeft size={22} />
        </button>

        <div className="flex items-center gap-1">
          {onOpenExternalPr && (
            <button
              type="button"
              onClick={onOpenExternalPr}
              aria-label="Copy PR link"
              className={cn('rounded-full hover:bg-white/[0.08]', IOS_CLASSES.touchMin, 'flex items-center justify-center')}
            >
              <Link2 size={18} className="text-white/70" />
            </button>
          )}
          <button
            type="button"
            aria-label="More options"
            className={cn('rounded-full hover:bg-white/[0.08]', IOS_CLASSES.touchMin, 'flex items-center justify-center')}
          >
            <MoreHorizontal size={18} className="text-white/70" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="px-4 pt-4 pb-6 max-w-lg mx-auto space-y-4">
          {/* Status + stats */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'px-2.5 py-0.5 rounded-full text-xs font-semibold',
                isMerged
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
              )}
            >
              {isMerged ? 'Merged' : 'Open'}
            </span>
            <span className="font-mono text-sm tabular-nums">
              <span className="text-emerald-400">+{pr.additions}</span>
              <span className="text-white/30 mx-1">·</span>
              <span className="text-rose-400">-{pr.deletions}</span>
              <span className="text-white/30 mx-1">·</span>
              <span className="text-white/50">{pr.files.length} Files</span>
            </span>
          </div>

          <h1 className={cn('text-white', IOS_TYPE.title2)}>{pr.title}</h1>
          <p className={cn('text-white/40 font-mono', IOS_TYPE.caption1)}>#{pr.number}</p>

          {/* Tabs */}
          <div
            className="flex gap-1 p-1 rounded-xl bg-white/[0.06]"
            role="tablist"
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex-1 min-h-[40px] rounded-lg text-[15px] font-medium transition-colors touch-manipulation',
                  tab === t.id
                    ? 'bg-white/15 text-white'
                    : 'text-white/45 hover:text-white/70',
                )}
              >
                {t.label}
                {t.id === 'commits' && commits.length > 0 && (
                  <span className="ml-1 text-white/40">{commits.length}</span>
                )}
              </button>
            ))}
          </div>

          {isMerged && mergedAt && (
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] space-y-2">
              <div className="flex items-center gap-2 text-purple-300">
                <CheckCircle2 size={18} />
                <span className={IOS_TYPE.headline}>PR Merged and Closed</span>
              </div>
              {mergedBy && (
                <p className={cn('text-white/50', IOS_TYPE.subhead)}>
                  Merged by {mergedBy}
                </p>
              )}
              <p className={cn('text-white/35', IOS_TYPE.caption1)}>{mergedAt}</p>
            </div>
          )}

          <p className={cn('text-white/45', IOS_TYPE.subhead)}>
            {pr.author} opened this PR · {pr.createdAt}
          </p>

          {tab === 'overview' && (
            <div data-zone="pr_tab_overview" className="space-y-4">
              <section>
                <h2 className={cn('text-white mb-2', IOS_TYPE.headline)}>Summary</h2>
                <div className="prose prose-invert prose-sm max-w-none prose-p:text-white/70 prose-a:text-blue-400">
                  <ReactMarkdown>{pr.specMarkdown}</ReactMarkdown>
                </div>
              </section>

              <WorkDiffChangesCard pr={pr} onOpenSheet={onOpenChangesSheet} />
            </div>
          )}

          {tab === 'discussion' && (
            <div
              data-zone="pr_tab_discussion"
              className="py-12 text-center text-white/40"
            >
              <p className={IOS_TYPE.subhead}>No discussion yet.</p>
              <p className={cn('mt-1', IOS_TYPE.caption1)}>Review comments will appear here.</p>
            </div>
          )}

          {tab === 'commits' && (
            <ul data-zone="pr_tab_commits" className="space-y-2">
              {commits.map((c) => (
                <li
                  key={c.sha}
                  className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.07] space-y-2"
                >
                  <div className="flex items-start gap-3">
                    <GitCommit size={16} className="text-purple-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-white', IOS_TYPE.subhead)}>{c.message}</p>
                      <p className={cn('text-white/40 mt-1 font-mono', IOS_TYPE.caption1)}>
                        {c.shortSha} · {c.author} · {c.timestamp}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Sticky actions */}
      <div
        data-zone="primary_actions"
        className={cn(
          'shrink-0 px-4 pt-3 border-t border-white/[0.08] bg-[#0a0a0a]/95 backdrop-blur-md',
          IOS_CLASSES.safeBottom,
        )}
      >
        <div className="max-w-lg mx-auto flex gap-2">
          <button
            type="button"
            onClick={onOpenChangesSheet}
            className={cn(
              'flex-1 min-h-[48px] rounded-full bg-white/[0.08] border border-white/[0.1]',
              'text-white font-semibold text-[15px] flex items-center justify-center gap-2',
              'touch-manipulation active:scale-[0.98]',
            )}
          >
            <GitBranch size={16} />
            View changes
          </button>
          {!isMerged && onSquashAndMerge && (
            <button
              type="button"
              onClick={onSquashAndMerge}
              className={cn(
                'flex-1 min-h-[48px] rounded-full bg-emerald-600 text-white font-bold text-[15px]',
                'touch-manipulation active:scale-[0.98]',
              )}
            >
              Squash & Merge
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
