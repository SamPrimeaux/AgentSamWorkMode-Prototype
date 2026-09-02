import { FileCode, FileJson, FileText, Braces } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type WorkDiffFileKind = 'markdown' | 'json' | 'mdc' | 'typescript' | 'unknown';

export function fileKindFromName(filename: string): WorkDiffFileKind {
  if (filename.endsWith('.md') || filename.endsWith('.mdx')) return 'markdown';
  if (filename.endsWith('.mdc')) return 'mdc';
  if (filename.endsWith('.json') || filename.endsWith('.jsonc')) return 'json';
  if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(filename)) return 'typescript';
  return 'unknown';
}

export function fileKindIcon(kind: WorkDiffFileKind): LucideIcon {
  switch (kind) {
    case 'markdown':
    case 'mdc':
      return FileText;
    case 'json':
      return FileJson;
    case 'typescript':
      return Braces;
    default:
      return FileCode;
  }
}

export function fileKindLabel(kind: WorkDiffFileKind): string {
  switch (kind) {
    case 'markdown':
      return 'M↓';
    case 'mdc':
      return 'mdc';
    case 'json':
      return '{}';
    case 'typescript':
      return 'TS';
    default:
      return '·';
  }
}

/** Truncate long paths for mobile list rows. */
export function truncateFilename(name: string, max = 28): string {
  if (name.length <= max) return name;
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
  const base = name.slice(0, name.length - ext.length);
  const keep = max - ext.length - 1;
  if (keep < 4) return `${name.slice(0, max - 1)}…`;
  return `${base.slice(0, keep)}…${ext}`;
}

/** Parent directory hint for nested paths (e.g. `.cursor` under mcp.json). */
export function parentDirHint(path: string): string | null {
  const parts = path.split('/');
  if (parts.length < 2) return null;
  return parts[parts.length - 2];
}
