import { apiFetch } from '../apiClient';
import type { StorageAdapter, StorageContext, StorageListResult, StoredObject } from './types';

/**
 * Cloudflare storage via AgentSamRemix APIs:
 * - Artifacts → /api/artifacts (R2 ARTIFACTS bucket + D1)
 * - CMS pages → /api/cms/pages (D1 + CMS_BUCKET R2)
 * - Raw objects → /api/r2/objects (when available)
 */
export function createCloudflareStorageAdapter(ctx: StorageContext = {}): StorageAdapter {
  const project = ctx.projectSlug || 'default';

  return {
    backend: 'cloudflare',
    async list(prefix: string): Promise<StorageListResult> {
      if (prefix.startsWith('cms/') || prefix === 'cms') {
        const res = await apiFetch<{ pages?: Array<{ id: string; slug: string; title?: string }> }>(
          `/api/cms/pages?project_id=${encodeURIComponent(project)}`,
        );
        if (!res.ok) return { objects: [], prefix };
        return {
          prefix,
          objects: (res.data.pages || []).map((p) => ({
            key: `cms/pages/${p.slug}`,
            name: p.title || p.slug,
            mimeType: 'text/html',
            url: `/api/cms/pages/${p.id}`,
          })),
        };
      }

      const res = await apiFetch<{ artifacts?: Array<{ id: string; name?: string; artifact_type?: string; public_url?: string }> }>(
        '/api/artifacts',
      );
      if (!res.ok) return { objects: [], prefix };
      return {
        prefix,
        objects: (res.data.artifacts || [])
          .filter((a) => !prefix || String(a.name || '').startsWith(prefix))
          .map((a) => ({
            key: `artifacts/${a.id}`,
            name: a.name || a.id,
            mimeType: a.artifact_type || 'application/octet-stream',
            url: a.public_url || `/api/artifacts/${a.id}/content`,
          })),
      };
    },
    async get(key: string): Promise<StoredObject | null> {
      const artifactMatch = key.match(/^artifacts\/([^/]+)$/);
      if (artifactMatch) {
        const id = artifactMatch[1];
        const res = await fetch(`/api/artifacts/${id}/content`, { credentials: 'include' });
        if (!res.ok) return null;
        const blob = await res.blob();
        return {
          key,
          name: id,
          mimeType: res.headers.get('content-type') || 'application/octet-stream',
          sizeBytes: blob.size,
          url: `/api/artifacts/${id}/content`,
        };
      }
      return null;
    },
    async put(key: string, body: Blob | string, meta = {}): Promise<StoredObject> {
      const form = new FormData();
      const blob = typeof body === 'string' ? new Blob([body], { type: meta.mimeType }) : body;
      form.append('file', blob, meta.name || key.split('/').pop() || 'file');
      form.append('artifact_type', meta.mimeType?.startsWith('image/') ? 'image' : 'other');
      form.append('name', meta.name || key);

      const res = await apiFetch<{ id?: string; public_url?: string }>('/api/draw', {
        method: 'POST',
        body: form,
      });
      if (!res.ok) throw new Error(res.error.error);
      return {
        key: `artifacts/${res.data.id}`,
        name: meta.name || key,
        mimeType: meta.mimeType || 'application/octet-stream',
        url: res.data.public_url || (res.data.id ? `/api/artifacts/${res.data.id}/content` : undefined),
        createdAt: new Date().toISOString(),
      };
    },
    async remove(_key: string): Promise<void> {
      throw new Error('Cloudflare artifact delete not exposed in prototype — use dashboard');
    },
    getPublicUrl(key: string): string | null {
      const m = key.match(/^artifacts\/([^/]+)$/);
      return m ? `/api/artifacts/${m[1]}/content` : null;
    },
  };
}
