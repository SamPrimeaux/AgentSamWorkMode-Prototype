import { apiFetch } from '../apiClient';

export type FileEntry = {
  name: string;
  kind: 'file' | 'directory';
  path: string;
};

export async function listBridgeFiles(path = '.'): Promise<FileEntry[]> {
  const q = new URLSearchParams({ path });
  const res = await apiFetch<{ ok?: boolean; entries?: FileEntry[] }>(`/api/bridge/fs/list?${q}`);
  if (!res.ok || !res.data.entries) return [];
  return res.data.entries;
}

export async function readBridgeFile(path: string): Promise<string | null> {
  const q = new URLSearchParams({ path });
  const res = await apiFetch<{ ok?: boolean; content?: string }>(`/api/bridge/fs/read?${q}`);
  if (!res.ok) return null;
  return res.data.content ?? null;
}

export async function writeBridgeFile(path: string, content: string): Promise<boolean> {
  const res = await apiFetch<{ ok?: boolean }>('/api/bridge/fs/write', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, content }),
  });
  return res.ok && res.data.ok === true;
}

export function monacoLanguageForPath(filePath: string): string {
  const name = filePath.split('/').pop() || '';
  if (name.endsWith('.tsx') || name.endsWith('.ts')) return 'typescript';
  if (name.endsWith('.jsx') || name.endsWith('.js') || name.endsWith('.mjs')) return 'javascript';
  if (name.endsWith('.json')) return 'json';
  if (name.endsWith('.md')) return 'markdown';
  if (name.endsWith('.css')) return 'css';
  if (name.endsWith('.html')) return 'html';
  if (name.endsWith('.yml') || name.endsWith('.yaml')) return 'yaml';
  if (name.endsWith('.sh')) return 'shell';
  return 'plaintext';
}
