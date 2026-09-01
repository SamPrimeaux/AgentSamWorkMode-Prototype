import http from 'node:http';
import { spawn } from 'node:child_process';
import { createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function resolveRoot(root) {
  return path.resolve(root || process.cwd());
}

function safePath(root, rel) {
  const base = resolveRoot(root);
  const target = path.resolve(base, String(rel || '.').replace(/^\/+/, ''));
  if (!target.startsWith(base)) throw new Error('path_escape');
  return target;
}

async function listDir(root, rel) {
  const dir = safePath(root, rel);
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries.map((e) => ({
    name: e.name,
    kind: e.isDirectory() ? 'directory' : 'file',
    path: path.join(String(rel || '.'), e.name).replace(/\\/g, '/'),
  }));
}

async function readFile(root, rel) {
  const fp = safePath(root, rel);
  const stat = await fs.stat(fp);
  if (!stat.isFile()) throw new Error('not_a_file');
  const content = await fs.readFile(fp, 'utf8');
  return { path: rel, content, size: stat.size };
}

async function writeFile(root, rel, content) {
  const fp = safePath(root, rel);
  await fs.mkdir(path.dirname(fp), { recursive: true });
  await fs.writeFile(fp, content, 'utf8');
  return { path: rel, bytes: Buffer.byteLength(content, 'utf8') };
}

function spawnShell(platform) {
  if (platform === 'windows') {
    return spawn('powershell.exe', ['-NoLogo'], { cwd: process.cwd(), env: process.env });
  }
  const shell = process.env.SHELL || '/bin/bash';
  return spawn(shell, ['-l'], { cwd: process.cwd(), env: process.env });
}

function attachPtyWs(ws, platform) {
  const child = spawnShell(platform);
  const sendOutput = (data) => {
    if (ws.readyState !== ws.OPEN) return;
    ws.send(JSON.stringify({ type: 'output', data: String(data) }));
  };

  ws.send(JSON.stringify({ type: 'state', status: 'connected' }));
  ws.send(JSON.stringify({ type: 'session_id', session_id: `bridge_${Date.now()}` }));

  child.stdout.on('data', sendOutput);
  child.stderr.on('data', sendOutput);
  child.on('exit', (code) => {
    sendOutput(`\r\n\x1b[38;5;240m[bridge] shell exited (${code})\x1b[0m\r\n`);
    try {
      ws.close();
    } catch {
      /* ignore */
    }
  });

  ws.on('message', (raw) => {
    const text = Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw);
    try {
      const msg = JSON.parse(text);
      if (msg?.type === 'resize') return;
      if (msg?.type === 'slash') {
        child.stdin.write(`${msg.line}\n`);
        return;
      }
    } catch {
      /* raw input */
    }
    child.stdin.write(text);
  });

  ws.on('close', () => {
    try {
      child.kill();
    } catch {
      /* ignore */
    }
  });
}

/**
 * @param {{ port: number; host?: string; root?: string; platform?: string }} opts
 */
export function startBridgeServer(opts) {
  const port = opts.port || 3099;
  const host = opts.host || '127.0.0.1';
  const root = resolveRoot(opts.root || process.cwd());
  const platform = opts.platform || 'linux';

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${host}`);
    try {
      if (url.pathname === '/health') {
        return json(res, 200, { ok: true, root, platform });
      }
      if (url.pathname === '/fs/list' && req.method === 'GET') {
        const entries = await listDir(root, url.searchParams.get('path') || '.');
        return json(res, 200, { ok: true, entries, root });
      }
      if (url.pathname === '/fs/read' && req.method === 'GET') {
        const file = await readFile(root, url.searchParams.get('path') || '');
        return json(res, 200, { ok: true, ...file });
      }
      if (url.pathname === '/fs/write' && req.method === 'POST') {
        let body = '';
        for await (const chunk of req) body += chunk;
        const parsed = JSON.parse(body || '{}');
        const out = await writeFile(root, parsed.path, parsed.content ?? '');
        return json(res, 200, { ok: true, ...out });
      }
      res.writeHead(404);
      res.end('not found');
    } catch (e) {
      json(res, 400, { ok: false, error: e?.message || 'request_failed' });
    }
  });

  const wss = new WebSocketServer({ noServer: true });
  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url || '/', `http://${host}`);
    if (url.pathname !== '/terminal') {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      attachPtyWs(ws, platform);
    });
  });

  return new Promise((resolve) => {
    server.listen(port, host, () => {
      resolve({
        server,
        wss,
        url: `http://${host}:${port}`,
        wsUrl: `ws://${host}:${port}/terminal`,
        root,
      });
    });
  });
}
