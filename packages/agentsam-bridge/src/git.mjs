import { spawn } from 'node:child_process';

/**
 * @param {string} cwd
 * @param {string[]} args
 * @returns {Promise<{ stdout: string; stderr: string; code: number }>}
 */
export function runGit(cwd, args) {
  return new Promise((resolve) => {
    const child = spawn('git', args, { cwd, env: process.env });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('close', (code) => {
      resolve({ stdout, stderr, code: code ?? 1 });
    });
    child.on('error', (err) => {
      resolve({ stdout: '', stderr: err.message, code: 1 });
    });
  });
}

/**
 * @param {string} root
 */
export async function gitStatusJson(root) {
  const branchRes = await runGit(root, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const hashRes = await runGit(root, ['rev-parse', '--short', 'HEAD']);
  const upstreamRes = await runGit(root, ['rev-parse', '--abbrev-ref', '@{upstream}']);
  const porcelain = await runGit(root, ['status', '--porcelain=v1', '-b']);

  const lines = porcelain.stdout.split('\n').filter(Boolean);
  const branchLine = lines[0]?.startsWith('##') ? lines[0] : '';
  const fileLines = lines.filter((l) => !l.startsWith('##'));

  const staged = [];
  const unstaged = [];
  for (const line of fileLines) {
    const xy = line.slice(0, 2);
    const path = line.slice(3).trim();
    if (!path) continue;
    const index = xy[0];
    const workTree = xy[1];
    if (index !== ' ' && index !== '?') {
      staged.push({ path, status: index });
    }
    if (workTree !== ' ' && workTree !== '?') {
      unstaged.push({ path, status: workTree });
    }
    if (xy === '??') {
      unstaged.push({ path, status: '?' });
    }
  }

  let tracking_branch = null;
  const branchMatch = branchLine.match(/^## ([^\s.]+)(?:\.\.\.([^ ]+))?/);
  const branch = branchMatch?.[1] || branchRes.stdout.trim() || 'HEAD';
  if (branchMatch?.[2]) {
    tracking_branch = branchMatch[2].replace(/^origin\//, '');
  } else if (upstreamRes.code === 0) {
    tracking_branch = upstreamRes.stdout.trim().replace(/^origin\//, '');
  }

  return {
    branch,
    hash: hashRes.stdout.trim(),
    tracking_branch,
    staged,
    unstaged,
    porcelain: porcelain.stdout,
  };
}

/**
 * @param {string} root
 * @param {{ path?: string }} [opts]
 */
export async function gitDiffText(root, opts = {}) {
  const args = ['diff', '--unified=3'];
  if (opts.path) args.push('--', opts.path);
  const unstaged = await runGit(root, args);
  const staged = await runGit(root, ['diff', '--cached', '--unified=3', ...(opts.path ? ['--', opts.path] : [])]);
  const combined = [staged.stdout, unstaged.stdout].filter(Boolean).join('\n');
  return combined.trim();
}

/**
 * @param {string} root
 * @param {number} [n]
 */
export async function gitLogJson(root, n = 5) {
  const res = await runGit(root, [
    'log',
    `-n`,
    String(n),
    '--format=%H|%h|%s|%an|%ar',
  ]);
  if (res.code !== 0) return [];
  return res.stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [sha, shortSha, message, author, timestamp] = line.split('|');
      return { sha, shortSha, message, author, timestamp };
    });
}
