import { useCallback, useEffect, useState } from 'react';
import {
  listBridgeFiles,
  readBridgeFile,
  writeBridgeFile,
  type FileEntry,
} from '../lib/bridge/fileBridgeApi';

export type OpenFile = {
  path: string;
  content: string;
  dirty: boolean;
};

export function useFileBridge(rootPath = '.') {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [currentPath, setCurrentPath] = useState(rootPath);
  const [openFile, setOpenFile] = useState<OpenFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bridgeAvailable, setBridgeAvailable] = useState(false);

  const refresh = useCallback(async (path = currentPath) => {
    setLoading(true);
    setError(null);
    try {
      const health = await fetch('/api/bridge/health').then((r) => r.ok).catch(() => false);
      setBridgeAvailable(health);
      if (!health) {
        setEntries([]);
        setError('Bridge not running — start agentsam-bridge run');
        return;
      }
      const list = await listBridgeFiles(path);
      setEntries(list);
      setCurrentPath(path);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'list failed');
    } finally {
      setLoading(false);
    }
  }, [currentPath]);

  const open = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const content = await readBridgeFile(path);
      if (content == null) throw new Error('read failed');
      setOpenFile({ path, content, dirty: false });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'open failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const save = useCallback(async (content?: string) => {
    if (!openFile) return false;
    const body = content ?? openFile.content;
    const ok = await writeBridgeFile(openFile.path, body);
    if (ok) setOpenFile({ ...openFile, content: body, dirty: false });
    return ok;
  }, [openFile]);

  const setContent = useCallback((content: string) => {
    setOpenFile((f) => (f ? { ...f, content, dirty: true } : f));
  }, []);

  useEffect(() => {
    void refresh(rootPath);
  }, [refresh, rootPath]);

  return {
    entries,
    currentPath,
    openFile,
    loading,
    error,
    bridgeAvailable,
    refresh,
    open,
    save,
    setContent,
    setCurrentPath,
  };
}
