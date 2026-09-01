import { apiFetch } from '../apiClient';
import type { StorageAdapter, StorageContext, StorageListResult, StoredObject } from './types';

type GDriveFile = {
  id: string;
  name: string;
  mimeType?: string;
  size?: string;
  webViewLink?: string;
  modifiedTime?: string;
};

/**
 * Google Drive via /api/integrations/gdrive/* (requires OAuth connect in IAM).
 */
export function createGDriveStorageAdapter(ctx: StorageContext = {}): StorageAdapter {
  const folderId = ctx.projectSlug || 'root';

  return {
    backend: 'gdrive',
    async list(prefix: string): Promise<StorageListResult> {
      const q = folderId !== 'root' ? `folder_id=${encodeURIComponent(folderId)}` : '';
      const path = q ? `/api/integrations/gdrive/files?${q}` : '/api/integrations/gdrive/files';
      const res = await apiFetch<{ files?: GDriveFile[] }>(path);
      if (!res.ok) return { objects: [], prefix };
      return {
        prefix,
        objects: (res.data.files || [])
          .filter((f) => !prefix || f.name.startsWith(prefix))
          .map((f) => ({
            key: `gdrive/${f.id}`,
            name: f.name,
            mimeType: f.mimeType || 'application/octet-stream',
            sizeBytes: f.size ? Number(f.size) : undefined,
            url: f.webViewLink,
            createdAt: f.modifiedTime,
          })),
      };
    },
    async get(key: string): Promise<StoredObject | null> {
      const id = key.replace(/^gdrive\//, '');
      const res = await apiFetch<GDriveFile>(`/api/integrations/gdrive/files/${encodeURIComponent(id)}`);
      if (!res.ok) return null;
      const f = res.data;
      return {
        key,
        name: f.name,
        mimeType: f.mimeType || 'application/octet-stream',
        url: f.webViewLink,
        createdAt: f.modifiedTime,
      };
    },
    async put(key: string, body: Blob | string, meta = {}): Promise<StoredObject> {
      const form = new FormData();
      const blob = typeof body === 'string' ? new Blob([body], { type: meta.mimeType }) : body;
      form.append('file', blob, meta.name || key.split('/').pop() || 'file');
      if (folderId !== 'root') form.append('parent_id', folderId);
      const res = await apiFetch<GDriveFile>('/api/integrations/gdrive/upload', {
        method: 'POST',
        body: form,
      });
      if (!res.ok) throw new Error(res.error.error);
      return {
        key: `gdrive/${res.data.id}`,
        name: res.data.name,
        mimeType: res.data.mimeType || meta.mimeType || 'application/octet-stream',
        url: res.data.webViewLink,
        createdAt: res.data.modifiedTime,
      };
    },
    async remove(key: string): Promise<void> {
      const id = key.replace(/^gdrive\//, '');
      const res = await apiFetch(`/api/integrations/gdrive/files/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(res.error.error);
    },
    getPublicUrl(key: string): string | null {
      return null;
    },
  };
}
