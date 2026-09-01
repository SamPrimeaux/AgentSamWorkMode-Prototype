/** Pluggable storage for brand assets and CMS drafts. */

export type StorageBackend = 'local' | 'cloudflare' | 'gdrive';

export type StoredObject = {
  key: string;
  name: string;
  mimeType: string;
  sizeBytes?: number;
  url?: string;
  createdAt?: string;
  metadata?: Record<string, string>;
};

export type StorageListResult = { objects: StoredObject[]; prefix?: string };

export interface StorageAdapter {
  readonly backend: StorageBackend;
  list(prefix: string): Promise<StorageListResult>;
  get(key: string): Promise<StoredObject | null>;
  put(key: string, body: Blob | string, meta?: { mimeType?: string; name?: string }): Promise<StoredObject>;
  remove(key: string): Promise<void>;
  getPublicUrl(key: string): string | null;
}

export type StorageContext = {
  workspaceId?: string;
  projectSlug?: string;
  userId?: string;
};
