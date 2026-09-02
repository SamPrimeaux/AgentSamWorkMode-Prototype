import type { WorkbenchChangedFile } from '../../types';
import type { WorkDiffCommit, WorkDiffSession } from './interactions';
import { gitStatusToFileStatus, parseUnifiedDiff, type ParsedDiffFile } from './parseUnifiedDiff';
import type { GitStatusPayload } from '../../hooks/useGitBridge';

export type GitDiffPayload = {
  patch: string;
  branch: string;
  hash?: string;
  tracking_branch?: string | null;
  repo_full_name?: string | null;
  commits?: WorkDiffCommit[];
};

function basename(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

function mergeFileRows(
  parsed: ParsedDiffFile[],
  status?: GitStatusPayload | null,
): WorkbenchChangedFile[] {
  const byPath = new Map<string, WorkbenchChangedFile>();

  for (const file of parsed) {
    byPath.set(file.path, {
      id: `git-${file.path}`,
      filename: basename(file.path),
      path: file.path,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      diffLines: file.diffLines.length ? file.diffLines : [{ type: 'normal', content: '(no diff text)' }],
    });
  }

  const statusRows = [...(status?.staged || []), ...(status?.unstaged || [])];
  for (const row of statusRows) {
    if (!row.path || byPath.has(row.path)) continue;
    const st = gitStatusToFileStatus((row.status || 'M').trim());
    byPath.set(row.path, {
      id: `git-${row.path}`,
      filename: basename(row.path),
      path: row.path,
      status: st,
      additions: row.additions ?? 0,
      deletions: row.deletions ?? 0,
      diffLines: [{ type: 'normal', content: `(${st} — expand after refresh)` }],
    });
  }

  return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
}

function totals(files: WorkbenchChangedFile[]) {
  return files.reduce(
    (acc, f) => ({ additions: acc.additions + f.additions, deletions: acc.deletions + f.deletions }),
    { additions: 0, deletions: 0 },
  );
}

export function buildWorkDiffSession(
  payload: GitDiffPayload,
  options?: {
    agentSummary?: string;
    status?: GitStatusPayload | null;
  },
): WorkDiffSession | null {
  const parsed = parseUnifiedDiff(payload.patch);
  const files = mergeFileRows(parsed, options?.status);
  if (files.length === 0) return null;

  const { additions, deletions } = totals(files);
  const branch = payload.branch || options?.status?.branch || 'HEAD';
  const targetBranch =
    payload.tracking_branch || options?.status?.tracking_branch || 'main';
  const repo = payload.repo_full_name || options?.status?.repo_full_name || '';
  const hash = payload.hash || options?.status?.hash || '';

  const title = repo
    ? `Changes on ${branch} (${repo})`
    : `Changes on ${branch}`;

  const specMarkdown = [
    '## Summary',
    '',
    options?.agentSummary?.trim() ||
      `Local git changes on \`${branch}\` vs \`${targetBranch}\`.`,
    '',
    '## Files',
    '',
    ...files.map((f) => `- \`${f.path}\` (+${f.additions} / -${f.deletions})`),
  ].join('\n');

  return {
    agentSummary:
      options?.agentSummary?.trim() ||
      `${files.length} file${files.length === 1 ? '' : 's'} changed on ${branch} (+${additions} / -${deletions}).`,
    commits: payload.commits || [],
    pr: {
      id: hash ? `work-${hash}` : `work-${branch}`,
      number: 0,
      title,
      branch,
      targetBranch,
      author: 'You',
      status: 'working',
      createdAt: 'just now',
      updatedAt: 'just now',
      summary: `+${additions} -${deletions} across ${files.length} files`,
      specMarkdown,
      additions,
      deletions,
      files,
    },
  };
}
