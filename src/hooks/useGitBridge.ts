import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/apiClient';
import {
  readIamGitStatusCache,
  writeIamGitStatusCache,
  type GitStatusCacheContext,
} from '../lib/iamGitStatusCache';

export type GitFileRow = {
  path: string;
  status?: string;
  additions?: number;
  deletions?: number;
};

export type GitStatusPayload = {
  status?: string;
  branch?: string | null;
  repo_full_name?: string | null;
  tracking_branch?: string;
  ahead?: number;
  behind?: number;
  hash?: string;
  cwd?: string | null;
  connection_id?: string | null;
  staged?: GitFileRow[];
  unstaged?: GitFileRow[];
  error?: string;
};

export type GitBridgeContext = {
  /** Exact runtime connection that owns the checkout. */
  connectionId?: string | null;
  /** Filesystem checkout path on that connection. */
  cwd?: string | null;
  /** Optional GitHub/remote identity for display or backend matching. */
  repoFullName?: string | null;
  /** Transitional compatibility hint only; never Git checkout authority. */
  workspaceId?: string | null;
};

function normalizeContext(input?: string | null | GitBridgeContext): GitBridgeContext {
  if (typeof input === 'string') return { workspaceId: input };
  return input || {};
}

function buildGitQuery(ctx: GitBridgeContext): URLSearchParams {
  const q = new URLSearchParams();
  if (ctx.connectionId) q.set('connection_id', ctx.connectionId);
  if (ctx.cwd) q.set('cwd', ctx.cwd);
  if (ctx.repoFullName) q.set('repo_full_name', ctx.repoFullName);
  if (ctx.workspaceId) q.set('workspace_id', ctx.workspaceId);
  return q;
}

/**
 * Git bridge for a concrete checkout.
 *
 * Git != GitHub != browser FSA:
 * - Git status belongs to a checkout identified by connectionId + cwd.
 * - repoFullName is remote repository identity/metadata, not the working tree itself.
 * - workspaceId remains optional compatibility metadata only.
 */
export function useGitBridge(input?: string | null | GitBridgeContext) {
  const ctx = useMemo(
    () => normalizeContext(input),
    [
      typeof input === 'string' ? input : input?.connectionId,
      typeof input === 'string' ? '' : input?.cwd,
      typeof input === 'string' ? '' : input?.repoFullName,
      typeof input === 'string' ? '' : input?.workspaceId,
    ],
  );

  const cacheContext: GitStatusCacheContext = useMemo(() => ({
    connectionId: ctx.connectionId,
    cwd: ctx.cwd,
    repoFullName: ctx.repoFullName,
  }), [ctx.connectionId, ctx.cwd, ctx.repoFullName]);

  const [status, setStatus] = useState<GitStatusPayload | null>(null);
  const [activeBranch, setActiveBranch] = useState('main');
  const [repoFullName, setRepoFullName] = useState(ctx.repoFullName || '');
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const cached = readIamGitStatusCache(cacheContext);
      if (cached?.branch) {
        setActiveBranch(cached.branch);
        setRepoFullName(cached.repo_full_name || ctx.repoFullName || '');
      }

      const q = buildGitQuery(ctx);
      const suffix = q.toString();
      const path = `/api/agent/git/status${suffix ? `?${suffix}` : ''}`;
      const res = await apiFetch<GitStatusPayload>(path);
      if (!res.ok) {
        setLive(false);
        if (res.error.status === 401) setAuthRequired(true);
        return;
      }

      const payload = res.data;
      setStatus(payload);
      setAuthRequired(false);
      if (payload.branch) setActiveBranch(payload.branch);
      if (payload.repo_full_name) setRepoFullName(payload.repo_full_name);

      writeIamGitStatusCache(
        {
          connectionId: payload.connection_id || ctx.connectionId,
          cwd: payload.cwd || ctx.cwd,
          repoFullName: payload.repo_full_name || ctx.repoFullName,
        },
        {
          connection_id: payload.connection_id || ctx.connectionId || undefined,
          cwd: payload.cwd || ctx.cwd || undefined,
          branch: payload.branch ?? undefined,
          repo_full_name: payload.repo_full_name || ctx.repoFullName || undefined,
          head_sha: payload.hash || undefined,
        },
      );
      setLive(true);
    } finally {
      setLoading(false);
    }
  }, [cacheContext, ctx]);

  useEffect(() => {
    void refresh();

    // Fallback poll only while visible. Mutations should call refresh directly.
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 60_000);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  const checkoutBranch = useCallback(
    async (branch: string) => {
      const q = buildGitQuery(ctx);
      const suffix = q.toString();
      const res = await apiFetch<{ ok?: boolean }>(`/api/agent/git/branch${suffix ? `?${suffix}` : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch,
          connection_id: ctx.connectionId || undefined,
          cwd: ctx.cwd || undefined,
        }),
      });
      if (res.ok) {
        setActiveBranch(branch);
        await refresh();
      }
      return res;
    },
    [ctx, refresh],
  );

  return {
    status,
    activeBranch,
    setActiveBranch,
    repoFullName,
    loading,
    live,
    authRequired,
    refreshGit: refresh,
    checkoutBranch,
    changedFiles: [...(status?.staged || []), ...(status?.unstaged || [])],
  };
}
