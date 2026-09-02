import type { WorkbenchChangedFile, WorkbenchPullRequest } from '../../types';

/**
 * Classified interaction zones in the mobile WorkDiff flow.
 * Each zone maps to a distinct UI surface and gesture vocabulary.
 */
export type WorkDiffInteractionZone =
  /** Agent narrative: summary text, recommendations, follow-up prompts. */
  | 'chat_thread'
  /** Teaser card embedded in chat: file count + top files + tap → sheet. */
  | 'changes_card'
  /** Full-screen or near-full bottom sheet: file inventory + expand. */
  | 'changes_sheet'
  /** Accordion row: tap chevron → inline read-only diff block. */
  | 'file_expand'
  /** Per-file overflow: copy path, view on GitHub, open on desktop. */
  | 'file_row_menu'
  /** PR metadata screen: status badge, title, tabs, merge actions. */
  | 'pr_overview'
  /** Overview tab: summary markdown, what's included, author. */
  | 'pr_tab_overview'
  /** Discussion tab: review comments (future). */
  | 'pr_tab_discussion'
  /** Commits tab: commit list with sha + message. */
  | 'pr_tab_commits'
  /** Sticky actions: View PR, Squash & Merge, Copy link. */
  | 'primary_actions'
  /** Bottom follow-up composer (voice + text). */
  | 'composer';

export type WorkDiffViewState =
  | 'idle'
  | 'chat_with_changes'
  | 'changes_sheet'
  | 'pr_overview';

export type WorkDiffPrTab = 'overview' | 'discussion' | 'commits';

export interface WorkDiffCommit {
  sha: string;
  shortSha: string;
  message: string;
  author: string;
  timestamp: string;
}

/** Agent-completed work package shown after a run finishes. */
export interface WorkDiffSession {
  pr: WorkbenchPullRequest;
  /** Plain-language agent summary shown above the Changes card. */
  agentSummary: string;
  commits: WorkDiffCommit[];
  mergedAt?: string;
  mergedBy?: string;
  externalPrUrl?: string;
}

export type WorkDiffZoneMeta = {
  zone: WorkDiffInteractionZone;
  label: string;
  gesture: string;
  primaryAction?: string;
};

/** Human-readable map for docs / debug overlays. */
export const WORK_DIFF_ZONE_CATALOG: WorkDiffZoneMeta[] = [
  { zone: 'chat_thread', label: 'Agent thread', gesture: 'Scroll', primaryAction: 'Read summary' },
  { zone: 'changes_card', label: 'Changes card', gesture: 'Tap', primaryAction: 'Open changes sheet' },
  { zone: 'changes_sheet', label: 'Changes sheet', gesture: 'Swipe down to dismiss', primaryAction: 'Expand file' },
  { zone: 'file_expand', label: 'File diff', gesture: 'Tap row chevron', primaryAction: 'Read diff' },
  { zone: 'file_row_menu', label: 'File menu', gesture: 'Tap …', primaryAction: 'Copy path' },
  { zone: 'pr_overview', label: 'PR overview', gesture: 'Tap View PR', primaryAction: 'Review PR' },
  { zone: 'pr_tab_overview', label: 'PR · Overview', gesture: 'Tap tab', primaryAction: 'Read spec' },
  { zone: 'pr_tab_discussion', label: 'PR · Discussion', gesture: 'Tap tab', primaryAction: 'Read comments' },
  { zone: 'pr_tab_commits', label: 'PR · Commits', gesture: 'Tap tab', primaryAction: 'Inspect commits' },
  { zone: 'primary_actions', label: 'PR actions', gesture: 'Tap button', primaryAction: 'Merge or open' },
  { zone: 'composer', label: 'Follow up', gesture: 'Type / mic', primaryAction: 'Steer agent' },
];

export function fileKey(file: WorkbenchChangedFile): string {
  return file.id || file.path;
}
