const IAM_GIT_STATUS_SESSION_PREFIX = 'iam_git_status_cache_v2';
const LEGACY_IAM_GIT_STATUS_SESSION_KEY = 'iam_git_status_cache_v1';
const IAM_GIT_STATUS_TTL_MS = 5 * 60 * 1000;

export type GitStatusCacheContext = {
  connectionId?: string | null;
  cwd?: string | null;
  repoFullName?: string | null;
};

export type IamGitStatusCache = {
  fetchedAt: number;
  connection_id?: string;
  cwd?: string;
  branch?: string;
  repo_full_name?: string;
  head_sha?: string;
};

function cacheKey(ctx: GitStatusCacheContext): string | null {
  const connection = String(ctx.connectionId || '').trim();
  const checkout = String(ctx.cwd || ctx.repoFullName || '').trim();
  if (!connection && !checkout) return null;
  return `${IAM_GIT_STATUS_SESSION_PREFIX}:${encodeURIComponent(connection || 'unknown')}:${encodeURIComponent(checkout || 'unknown')}`;
}

export function isIamGitStatusCacheFresh(cache: IamGitStatusCache | null): boolean {
  if (!cache) return false;
  return Date.now() - cache.fetchedAt < IAM_GIT_STATUS_TTL_MS;
}

export function readIamGitStatusCache(ctx: GitStatusCacheContext): IamGitStatusCache | null {
  if (typeof window === 'undefined') return null;
  const key = cacheKey(ctx);
  if (!key) return null;
  try {
    // Remove the old ambient cache once encountered. It could represent another checkout.
    sessionStorage.removeItem(LEGACY_IAM_GIT_STATUS_SESSION_KEY);
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as IamGitStatusCache;
    if (!parsed?.fetchedAt || !isIamGitStatusCacheFresh(parsed)) {
      sessionStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeIamGitStatusCache(
  ctx: GitStatusCacheContext,
  payload: Omit<IamGitStatusCache, 'fetchedAt'>,
): void {
  if (typeof window === 'undefined') return;
  const key = cacheKey(ctx);
  if (!key) return;
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({ ...payload, fetchedAt: Date.now() }),
    );
  } catch {
    /* disposable cache; quota failure must not affect Git authority */
  }
}
