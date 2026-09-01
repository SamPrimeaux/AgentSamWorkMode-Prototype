import type { StorageAdapter, StorageContext, StorageListResult, StoredObject } from './types';

const PREFIX = 'agentsam_storage_local_v1';

function storageKey(prefix: string, key: string): string {
  return `${PREFIX}:${prefix}:${key}`;
}

/** Dev-only: persists small blobs in localStorage (not for production). */
export function createLocalStorageAdapter(ctx: StorageContext = {}): StorageAdapter {
  const ns = ctx.projectSlug || ctx.workspaceId || 'default';

  return {
    backend: 'local',
    async list(prefix: string): Promise<StorageListResult> {
      if (typeof localStorage === 'undefined') return { objects: [], prefix };
      const objects: StoredObject[] = [];
      const needle = `${PREFIX}:${ns}:${prefix}`;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k?.startsWith(needle)) continue;
        const rel = k.slice(`${PREFIX}:${ns}:`.length);
        try {
          const raw = localStorage.getItem(k);
          if (!raw) continue;
          const parsed = JSON.parse(raw) as StoredObject;
          objects.push({ ...parsed, key: rel });
        } catch {
          /* skip */
        }
      }
      return { objects, prefix };
    },
    async get(key: string): Promise<StoredObject | null> {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(storageKey(ns, key));
      if (!raw) return null;
      try {
        return JSON.parse(raw) as StoredObject;
      } catch {
        return null;
      }
    },
    async put(key: string, body: Blob | string, meta = {}): Promise<StoredObject> {
      const text = typeof body === 'string' ? body : await body.text();
      const obj: StoredObject = {
        key,
        name: meta.name || key.split('/').pop() || key,
        mimeType: meta.mimeType || 'text/plain',
        sizeBytes: text.length,
        url: `data:${meta.mimeType || 'text/plain'};base64,${btoa(text)}`,
        createdAt: new Date().toISOString(),
      };
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(storageKey(ns, key), JSON.stringify(obj));
      }
      return obj;
    },
    async remove(key: string): Promise<void> {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(storageKey(ns, key));
      }
    },
    getPublicUrl(key: string): string | null {
      return null;
    },
  };
}
