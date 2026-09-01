import { useCallback, useEffect, useState } from 'react';
import { apiFetch, getWorkspaceId, workspaceQuery } from '../lib/apiClient';
import { readIamGitStatusCache, writeIamGitStatusCache } from '../lib/iamGitStatusCache';

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
  staged?: GitFileRow[];
  unstaged?: GitFileRow[];
  error?: string;
};

export function useGitBridge(workspaceId?: string | null) {
  const [status, setStatus] = useState<GitStatusPayload | null>(null);
  const [activeBranch, setActiveBranch] = useState('main');
  const [repoFullName, setRepoFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const cached = readIamGitStatusCache();
      if (cached?.branch) {
        setActiveBranch(cached.branch);
        setRepoFullName(cached.repo_full_name || cached.repo || '');
      }

      const ws = workspaceId ?? getWorkspaceId();
      const q = workspaceQuery(ws);
      const path = q ? `/api/agent/git/status?${q}` : '/api/agent/git/status';
      const res = await apiFetch<GitStatusPayload>(path);
      if (!res.ok) {
        if (res.error.status === 401) setAuthRequired(true);
        return;
      }
      const payload = res.data;
      setStatus(payload);
      setAuthRequired(false);
      if (payload.branch) setActiveBranch(payload.branch);
      if (payload.repo_full_name) setRepoFullName(payload.repo_full_name);
      writeIamGitStatusCache({
        branch: payload.branch ?? undefined,
        repo_full_name: payload.repo_full_name ?? undefined,
      });
      setLive(true);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const checkoutBranch = useCallback(
    async (branch: string) => {
      const ws = workspaceId ?? getWorkspaceId();
      const q = workspaceQuery(ws);
      const res = await apiFetch<{ ok?: boolean }>(`/api/agent/git/branch?${q}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch }),
      });
      if (res.ok) {
        setActiveBranch(branch);
        await refresh();
      }
      return res;
    },
    [workspaceId, refresh],
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
