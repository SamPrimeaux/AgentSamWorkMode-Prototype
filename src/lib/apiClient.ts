/**
 * HTTP client for AgentSamRemix Worker APIs.
 * In dev, server.ts proxies /api/* to VITE_IAM_ORIGIN when set.
 */

export function getIamOrigin(): string {
  const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : ({} as ImportMetaEnv);
  const fromEnv = String(env.VITE_IAM_ORIGIN || env.VITE_WORKER_URL || '').trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

export function getWorkspaceId(): string {
  const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : ({} as ImportMetaEnv);
  return String(env.VITE_WORKSPACE_ID || '').trim();
}

export type ApiError = { error?: string; code?: string; status: number };

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ ok: true; data: T } | { ok: false; error: ApiError }> {
  const url = path.startsWith('http') ? path : `${getIamOrigin()}${path.startsWith('/') ? path : `/${path}`}`;
  try {
    const res = await fetch(url, {
      credentials: 'include',
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.headers || {}),
      },
    });
    const text = await res.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    if (!res.ok) {
      const errBody = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
      return {
        ok: false,
        error: {
          status: res.status,
          error: String(errBody.error || res.statusText),
          code: errBody.code != null ? String(errBody.code) : undefined,
        },
      };
    }
    return { ok: true, data: body as T };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Network error';
    return { ok: false, error: { status: 0, error: message } };
  }
}

export function workspaceQuery(workspaceId?: string | null): string {
  const ws = (workspaceId || getWorkspaceId()).trim();
  return ws ? `workspace_id=${encodeURIComponent(ws)}` : '';
}
