import type { WorkbenchChangedFile } from '../../types';

export type ParsedDiffFile = {
  path: string;
  oldPath?: string;
  status: WorkbenchChangedFile['status'];
  diffLines: WorkbenchChangedFile['diffLines'];
  additions: number;
  deletions: number;
};

function countLineStats(lines: WorkbenchChangedFile['diffLines']) {
  let additions = 0;
  let deletions = 0;
  for (const line of lines) {
    if (line.type === 'add') additions += 1;
    if (line.type === 'del') deletions += 1;
  }
  return { additions, deletions };
}

function parseHunk(lines: string[], startIdx: number) {
  const diffLines: WorkbenchChangedFile['diffLines'] = [];
  let i = startIdx;
  let oldLine = 0;
  let newLine = 0;

  const header = lines[i];
  const match = header.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
  if (match) {
    oldLine = Number(match[1]);
    newLine = Number(match[2]);
  }
  diffLines.push({ type: 'header', content: header, oldLine, newLine });
  i += 1;

  for (; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('@@')) break;
    if (line.startsWith('diff --git')) break;

    const prefix = line[0];
    const content = line.slice(1);

    if (prefix === '+') {
      diffLines.push({ type: 'add', newLine, content: line });
      newLine += 1;
    } else if (prefix === '-') {
      diffLines.push({ type: 'del', oldLine, content: line });
      oldLine += 1;
    } else if (prefix === ' ' || prefix === undefined) {
      diffLines.push({
        type: 'normal',
        oldLine: oldLine || undefined,
        newLine: newLine || undefined,
        content: line.startsWith(' ') ? line : ` ${line}`,
      });
      if (oldLine) oldLine += 1;
      if (newLine) newLine += 1;
    } else {
      diffLines.push({ type: 'normal', content: line });
    }
  }

  return { diffLines, nextIndex: i };
}

function detectStatus(oldPath: string | undefined, newPath: string, patch: string): WorkbenchChangedFile['status'] {
  if (patch.includes('new file mode')) return 'added';
  if (patch.includes('deleted file mode')) return 'deleted';
  if (!oldPath || oldPath === '/dev/null') return 'added';
  if (newPath === '/dev/null') return 'deleted';
  return 'modified';
}

/**
 * Parse a unified diff patch into per-file structures for WorkDiff UI.
 */
export function parseUnifiedDiff(patch: string): ParsedDiffFile[] {
  if (!patch.trim()) return [];

  const chunks = patch.split(/^diff --git /m).filter(Boolean);
  const results: ParsedDiffFile[] = [];

  for (const chunk of chunks) {
    const lines = (`diff --git ${chunk}`).split('\n');
    const header = lines[0];
    const pathMatch = header.match(/^diff --git a\/(.+?) b\/(.+)$/);
    if (!pathMatch) continue;

    const oldPath = pathMatch[1];
    const newPath = pathMatch[2];
    const status = detectStatus(oldPath, newPath, chunk);
    const displayPath = status === 'deleted' ? oldPath : newPath;

    const diffLines: WorkbenchChangedFile['diffLines'] = [];
    let i = 1;
    while (i < lines.length) {
      if (lines[i].startsWith('@@')) {
        const hunk = parseHunk(lines, i);
        diffLines.push(...hunk.diffLines);
        i = hunk.nextIndex;
      } else {
        i += 1;
      }
    }

    const stats = countLineStats(diffLines);
    results.push({
      path: displayPath,
      oldPath: oldPath !== newPath ? oldPath : undefined,
      status,
      diffLines,
      additions: stats.additions,
      deletions: stats.deletions,
    });
  }

  return results;
}

export function gitStatusToFileStatus(code: string): WorkbenchChangedFile['status'] {
  if (code === 'A' || code === '?' ) return 'added';
  if (code === 'D') return 'deleted';
  return 'modified';
}
