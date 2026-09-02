import { apiFetch, getWorkspaceId, workspaceQuery } from '../apiClient';
import type { GitStatusPayload } from '../../hooks/useGitBridge';
import { buildWorkDiffSession, type GitDiffPayload } from './buildWorkDiffSession';
import type { WorkDiffCommit, WorkDiffSession } from './interactions';

type BridgeGitStatus = {
  ok?: boolean;
  branch?: string;
  hash?: string;
  tracking_branch?: string | null;
  staged?: Array<{ path: string; status: string }>;
  unstaged?: Array<{ path: string; status: string }>;
};

type BridgeGitDiff = {
  ok?: boolean;
  patch?: string;
  branch?: string;
  hash?: string;
  tracking_branch?: string | null;
};

type BridgeGitLog = {
  ok?: boolean;
  commits?: WorkDiffCommit[];
};

async function fetchBridgeGitStatus(): Promise<BridgeGitStatus | null> {
  const res = await fetch('/api/bridge/git/status');
  if (!res.ok) return null;
  const body = (await res.json()) as BridgeGitStatus;
  return body.ok ? body : null;
}

async function fetchBridgeGitDiff(): Promise<BridgeGitDiff | null> {
  const res = await fetch('/api/bridge/git/diff');
  if (!res.ok) return null;
  const body = (await res.json()) as BridgeGitDiff;
  return body.ok ? body : null;
}

async function fetchBridgeGitLog(): Promise<WorkDiffCommit[]> {
  const res = await fetch('/api/bridge/git/log?n=5');
  if (!res.ok) return [];
  const body = (await res.json()) as BridgeGitLog;
  return body.commits || [];
}

async function fetchIamGitStatus(workspaceId?: string | null): Promise<GitStatusPayload | null> {
  const ws = workspaceId ?? getWorkspaceId();
  const q = workspaceQuery(ws);
  const path = q ? `/api/agent/git/status?${q}` : '/api/agent/git/status';
  const res = await apiFetch<GitStatusPayload>(path);
  return res.ok ? res.data : null;
}

async function fetchIamGitDiffViaExec(workspaceId?: string | null): Promise<string | null> {
  const ws = workspaceId ?? getWorkspaceId();
  const q = workspaceQuery(ws);
  const res = await apiFetch<{ stdout?: string; output?: string }>(
    `/api/agent/terminal/exec?${q}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: 'git diff HEAD; git diff --cached',
        target_type: 'user_hosted_tunnel',
        execution_mode: 'batch_exec',
      }),
    },
  );
  if (!res.ok) return null;
  return (res.data.stdout || res.data.output || '').trim() || null;
}

function bridgeStatusToIamShape(status: BridgeGitStatus): GitStatusPayload {
  return {
    branch: status.branch,
    tracking_branch: status.tracking_branch || undefined,
    hash: status.hash,
    staged: status.staged?.map((r) => ({ path: r.path, status: r.status })),
    unstaged: status.unstaged?.map((r) => ({ path: r.path, status: r.status })),
  };
}

export type WorkDiffFetchResult = {
  session: WorkDiffSession | null;
  source: 'bridge' | 'iam' | null;
  error?: string;
};

/**
 * Level A: build WorkDiffSession from live git status + unified diff.
 * Prefers local agentsam-bridge; falls back to IAM git status + terminal exec.
 */
export async function fetchWorkDiffSession(options?: {
  workspaceId?: string | null;
  agentSummary?: string;
}): Promise<WorkDiffFetchResult> {
  const bridgeDiff = await fetchBridgeGitDiff();
  if (bridgeDiff?.patch) {
    const commits = await fetchBridgeGitLog();
    const status = await fetchBridgeGitStatus();
    const session = buildWorkDiffSession(
      {
        patch: bridgeDiff.patch,
        branch: bridgeDiff.branch || status?.branch || 'HEAD',
        hash: bridgeDiff.hash || status?.hash,
        tracking_branch: bridgeDiff.tracking_branch ?? status?.tracking_branch,
        commits,
      },
      {
        agentSummary: options?.agentSummary,
        status: status ? bridgeStatusToIamShape(status) : null,
      },
    );
    return { session, source: 'bridge' };
  }

  const iamStatus = await fetchIamGitStatus(options?.workspaceId);
  const iamPatch = await fetchIamGitDiffViaExec(options?.workspaceId);

  if (iamPatch || iamStatus) {
    const session = buildWorkDiffSession(
      {
        patch: iamPatch || '',
        branch: iamStatus?.branch || 'HEAD',
        hash: iamStatus?.hash,
        tracking_branch: iamStatus?.tracking_branch,
        repo_full_name: iamStatus?.repo_full_name,
        commits: [],
      },
      {
        agentSummary: options?.agentSummary,
        status: iamStatus,
      },
    );
    if (session) return { session, source: 'iam' };
  }

  if (iamStatus) {
    const files = [...(iamStatus.staged || []), ...(iamStatus.unstaged || [])];
    if (files.length > 0) {
      const session = buildWorkDiffSession(
        { patch: '', branch: iamStatus.branch || 'HEAD', repo_full_name: iamStatus.repo_full_name },
        { agentSummary: options?.agentSummary, status: iamStatus },
      );
      if (session) return { session, source: 'iam' };
    }
  }

  return {
    session: null,
    source: null,
    error: 'No git changes found. Run with npm run dev and agentsam-bridge, or connect IAM git.',
  };
}
