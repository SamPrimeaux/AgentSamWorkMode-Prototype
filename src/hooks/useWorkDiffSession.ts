import { useCallback, useRef, useState } from 'react';
import { fetchWorkDiffSession } from '../lib/workdiff/fetchWorkDiffSession';
import type { WorkDiffSession } from '../lib/workdiff/interactions';

export function useWorkDiffSession(workspaceId?: string | null) {
  const [session, setSession] = useState<WorkDiffSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'bridge' | 'iam' | null>(null);
  const lastSummaryRef = useRef<string | undefined>(undefined);

  const refresh = useCallback(
    async (agentSummary?: string) => {
      if (agentSummary) lastSummaryRef.current = agentSummary;
      setLoading(true);
      setError(null);
      try {
        const result = await fetchWorkDiffSession({
          workspaceId,
          agentSummary: agentSummary ?? lastSummaryRef.current,
        });
        setSession(result.session);
        setSource(result.source);
        setError(result.session ? null : result.error || 'No changes to review');
        return result.session;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to load git diff';
        setError(msg);
        setSession(null);
        setSource(null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [workspaceId],
  );

  const clear = useCallback(() => {
    setSession(null);
    setError(null);
    setSource(null);
    lastSummaryRef.current = undefined;
  }, []);

  return {
    session,
    loading,
    error,
    source,
    refresh,
    clear,
    hasChanges: Boolean(session?.pr.files.length),
  };
}
