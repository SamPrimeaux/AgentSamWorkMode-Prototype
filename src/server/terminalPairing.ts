/**
 * Dev / prototype device pairing store.
 * Production: AgentSamRemix Worker handles the same routes (see patches/0006-*).
 */
import type { Request, Response, Router } from 'express';
import express from 'express';
import { randomBytes } from 'node:crypto';

const PAIR_TTL_SEC = 600;

export type PairRecord = {
  pair_id: string;
  code: string;
  user_id: string;
  workspace_id: string;
  tenant_id: string;
  status: 'pending' | 'claimed' | 'connected' | 'expired' | 'cancelled';
  device_name: string | null;
  platform: string | null;
  shell: string | null;
  pty_token: string | null;
  connection_id: string | null;
  ws_url: string | null;
  created_at: number;
  expires_at: number;
  claimed_at: number | null;
  connected_at: number | null;
};

const pairsById = new Map<string, PairRecord>();
const pairIdByCode = new Map<string, string>();

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

function randomId(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString('hex')}`;
}

function formatCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let raw = '';
  const bytes = randomBytes(8);
  for (let i = 0; i < 8; i++) {
    raw += alphabet[bytes[i] % alphabet.length];
  }
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

function normalizeCode(code: string): string {
  return code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

function purgeExpired(): void {
  const now = nowSec();
  for (const [id, row] of pairsById) {
    if (row.expires_at <= now && row.status === 'pending') {
      row.status = 'expired';
      pairIdByCode.delete(normalizeCode(row.code));
    }
  }
}

function mockSessionUser(req: Request): { id: string; workspace_id: string; tenant_id: string } | null {
  const userId = String(req.headers['x-mock-user-id'] || process.env.MOCK_PAIR_USER_ID || 'dev_user').trim();
  const workspaceId = String(
    req.headers['x-iam-workspace-id'] ||
      req.query.workspace_id ||
      process.env.VITE_WORKSPACE_ID ||
      'dev_workspace',
  ).trim();
  if (!userId || !workspaceId) return null;
  return { id: userId, workspace_id: workspaceId, tenant_id: 'dev_tenant' };
}

function json(res: Response, status: number, body: unknown): void {
  res.status(status).json(body);
}

export function createTerminalPairingRouter(getWorkerOrigin: () => string): Router {
  const router = express.Router();

  router.post('/start', (req: Request, res: Response) => {
    purgeExpired();
    const user = mockSessionUser(req);
    if (!user) return json(res, 401, { error: 'Unauthorized' });

    const pairId = randomId('pair');
    const code = formatCode();
    const now = nowSec();
    const record: PairRecord = {
      pair_id: pairId,
      code,
      user_id: user.id,
      workspace_id: user.workspace_id,
      tenant_id: user.tenant_id,
      status: 'pending',
      device_name: String(req.body?.device_name || '').trim() || null,
      platform: String(req.body?.platform || '').trim() || null,
      shell: null,
      pty_token: null,
      connection_id: randomId('conn'),
      ws_url: null,
      created_at: now,
      expires_at: now + PAIR_TTL_SEC,
      claimed_at: null,
      connected_at: null,
    };
    pairsById.set(pairId, record);
    pairIdByCode.set(normalizeCode(code), pairId);

    const workerUrl = getWorkerOrigin();
    json(res, 200, {
      ok: true,
      pair_id: pairId,
      code,
      expires_at: record.expires_at,
      worker_url: workerUrl,
      cli_command: `npx agentsam-bridge pair ${code} --worker ${workerUrl}`,
    });
  });

  router.get('/status', (req: Request, res: Response) => {
    purgeExpired();
    const pairId = String(req.query.pair_id || '').trim();
    const row = pairsById.get(pairId);
    if (!row) return json(res, 404, { error: 'pair_not_found' });
    json(res, 200, {
      ok: true,
      pair_id: row.pair_id,
      status: row.status,
      code: row.status === 'pending' ? row.code : undefined,
      device_name: row.device_name,
      platform: row.platform,
      claimed_at: row.claimed_at,
      connected_at: row.connected_at,
      connection_id: row.connection_id,
      expires_at: row.expires_at,
    });
  });

  router.post('/claim', (req: Request, res: Response) => {
    purgeExpired();
    const code = normalizeCode(String(req.body?.code || ''));
    const pairId = pairIdByCode.get(code);
    if (!pairId) return json(res, 401, { error: 'invalid_or_expired_code' });
    const row = pairsById.get(pairId);
    if (!row || row.status !== 'pending' || row.expires_at <= nowSec()) {
      return json(res, 401, { error: 'invalid_or_expired_code' });
    }

    const ptyToken = randomId('pty');
    row.status = 'claimed';
    row.pty_token = ptyToken;
    row.device_name = String(req.body?.device_name || 'My machine').trim() || 'My machine';
    row.platform = String(req.body?.platform || 'unknown').trim() || 'unknown';
    row.shell = String(req.body?.shell || '/bin/bash').trim() || '/bin/bash';
    row.claimed_at = nowSec();
    pairIdByCode.delete(code);

    const workerUrl = getWorkerOrigin();
    json(res, 200, {
      ok: true,
      pair_id: row.pair_id,
      pty_token: ptyToken,
      worker_url: workerUrl,
      workspace_id: row.workspace_id,
      user_id: row.user_id,
      connection_id: row.connection_id,
      register_url: `${workerUrl}/api/terminal/session/register`,
      instructions:
        'Save PTY_AUTH_TOKEN locally, start your bridge on port 3099, then run agentsam-bridge run to register the tunnel.',
    });
  });

  router.post('/complete', (req: Request, res: Response) => {
    purgeExpired();
    const auth = req.headers.authorization || '';
    const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : auth.trim();
    const pairId = String(req.body?.pair_id || '').trim();
    const row = pairsById.get(pairId);
    if (!row || !row.pty_token || bearer !== row.pty_token) {
      return json(res, 401, { error: 'unauthorized' });
    }
    row.status = 'connected';
    row.ws_url = String(req.body?.ws_url || req.body?.tunnel_url || '').trim() || null;
    row.connected_at = nowSec();
    json(res, 200, {
      ok: true,
      connection_activated: true,
      connection_id: row.connection_id,
    });
  });

  router.delete('/:pairId', (req: Request, res: Response) => {
    const pairId = String(req.params.pairId || '').trim();
    const row = pairsById.get(pairId);
    if (!row) return json(res, 404, { error: 'pair_not_found' });
    row.status = 'cancelled';
    pairIdByCode.delete(normalizeCode(row.code));
    json(res, 200, { ok: true });
  });

  return router;
}
