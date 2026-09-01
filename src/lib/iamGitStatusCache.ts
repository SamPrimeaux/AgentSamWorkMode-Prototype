const IAM_GIT_STATUS_SESSION_KEY = 'iam_git_status_cache_v1';
const IAM_GIT_STATUS_TTL_MS = 5 * 60 * 1000;

export type IamGitStatusCache = {
  fetchedAt: number;
  branch?: string;
  repo?: string;
  repo_full_name?: string;
};

export function readIamGitStatusCache(): IamGitStatusCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(IAM_GIT_STATUS_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as IamGitStatusCache;
    return parsed?.fetchedAt ? parsed : null;
  } catch {
    return null;
  }
}

export function writeIamGitStatusCache(payload: Omit<IamGitStatusCache, 'fetchedAt'>): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(
      IAM_GIT_STATUS_SESSION_KEY,
      JSON.stringify({ ...payload, fetchedAt: Date.now() }),
    );
  } catch {
    /* quota */
  }
}

export function isIamGitStatusCacheFresh(cache: IamGitStatusCache | null): boolean {
  if (!cache) return false;
  return Date.now() - cache.fetchedAt < IAM_GIT_STATUS_TTL_MS;
}
