import type { StorageAdapter, StorageBackend, StorageContext } from './types';
import { createLocalStorageAdapter } from './localAdapter';
import { createCloudflareStorageAdapter } from './cloudflareAdapter';
import { createGDriveStorageAdapter } from './gdriveAdapter';
import { getIamOrigin } from '../apiClient';

export function resolveDefaultStorageBackend(): StorageBackend {
  const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : ({} as ImportMetaEnv);
  const explicit = String(env.VITE_STORAGE_BACKEND || '').trim().toLowerCase();
  if (explicit === 'local' || explicit === 'cloudflare' || explicit === 'gdrive') {
    return explicit;
  }
  return getIamOrigin() && !getIamOrigin().includes('localhost') ? 'cloudflare' : 'local';
}

export function createStorageAdapter(
  backend?: StorageBackend,
  ctx: StorageContext = {},
): StorageAdapter {
  const resolved = backend || resolveDefaultStorageBackend();
  switch (resolved) {
    case 'gdrive':
      return createGDriveStorageAdapter(ctx);
    case 'cloudflare':
      return createCloudflareStorageAdapter(ctx);
    case 'local':
    default:
      return createLocalStorageAdapter(ctx);
  }
}

export type { StorageAdapter, StorageBackend, StorageContext, StoredObject } from './types';
