import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { getWorkspaceId, getIamOrigin } from '../lib/apiClient';
import { createStorageAdapter, resolveDefaultStorageBackend, type StorageAdapter, type StorageBackend } from '../lib/storage';

export type PlatformContextValue = {
  workspaceId: string;
  iamOrigin: string;
  storageBackend: StorageBackend;
  storage: StorageAdapter;
  isPlatformConnected: boolean;
};

const PlatformContext = createContext<PlatformContextValue | null>(null);

export function PlatformProvider({
  children,
  workspaceId,
  storageBackend,
  projectSlug,
}: {
  children: ReactNode;
  workspaceId?: string;
  storageBackend?: StorageBackend;
  projectSlug?: string;
}) {
  const value = useMemo<PlatformContextValue>(() => {
    const ws = workspaceId || getWorkspaceId();
    const origin = getIamOrigin();
    const backend = storageBackend || resolveDefaultStorageBackend();
    const storage = createStorageAdapter(backend, {
      workspaceId: ws,
      projectSlug,
    });
    return {
      workspaceId: ws,
      iamOrigin: origin,
      storageBackend: backend,
      storage,
      isPlatformConnected: Boolean(origin && !origin.includes('localhost:4173')),
    };
  }, [workspaceId, storageBackend, projectSlug]);

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform(): PlatformContextValue {
  const ctx = useContext(PlatformContext);
  if (!ctx) {
    const backend = resolveDefaultStorageBackend();
    return {
      workspaceId: getWorkspaceId(),
      iamOrigin: getIamOrigin(),
      storageBackend: backend,
      storage: createStorageAdapter(backend),
      isPlatformConnected: false,
    };
  }
  return ctx;
}
