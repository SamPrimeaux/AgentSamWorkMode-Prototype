import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { claimPairingCode, completePairing, registerSession } from './api.mjs';
import { defaultDeviceName, defaultPlatform, loadConfig, saveConfig } from './config.mjs';

function parseArgs(argv) {
  const args = [...argv];
  const positional = [];
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--worker' || a === '-w') flags.worker = args[++i];
    else if (a === '--name' || a === '-n') flags.name = args[++i];
    else if (a === '--platform' || a === '-p') flags.platform = args[++i];
    else if (a === '--port') flags.port = Number(args[++i]);
    else if (a === '--help' || a === '-h') flags.help = true;
    else if (!a.startsWith('-')) positional.push(a);
  }
  return { positional, flags };
}

function usage() {
  console.log(`agentsam-bridge — pair your machine with Agent Sam Work Mode

Usage:
  agentsam-bridge pair <CODE> [--worker <url>] [--name <device>] [--platform macos|linux|windows]
  agentsam-bridge run [--port 3099]
  agentsam-bridge status [--worker <url>]

Examples:
  agentsam-bridge pair ABCD-1234 --worker http://localhost:3000
  agentsam-bridge run
`);
}

async function cmdPair(positional, flags) {
  const code = positional[1];
  if (!code) throw new Error('pairing code required');
  const cfg = await loadConfig();
  const workerUrl = flags.worker || cfg.WORKER_URL || process.env.AGENTSAM_WORKER_URL || 'http://localhost:3000';
  const deviceName = flags.name || defaultDeviceName();
  const plat = flags.platform || defaultPlatform();
  const shell = plat === 'windows' ? 'powershell' : plat === 'macos' ? 'zsh' : 'bash';

  console.log(`Claiming code on ${workerUrl}…`);
  const claimed = await claimPairingCode({
    workerUrl,
    code,
    deviceName,
    platform: plat,
    shell,
  });

  const configPath = await saveConfig({
    PTY_AUTH_TOKEN: claimed.pty_token,
    WORKER_URL: workerUrl,
    IAM_PTY_USER_ID: claimed.user_id,
    IAM_PTY_WORKSPACE_ID: claimed.workspace_id,
    PAIR_ID: claimed.pair_id,
    CONNECTION_ID: claimed.connection_id || '',
    PTY_PORT: String(flags.port || 3099),
    DEVICE_NAME: deviceName,
    PLATFORM: plat,
  });

  console.log(`\n✓ Paired as "${deviceName}" (${plat})`);
  console.log(`  Config: ${configPath}`);
  console.log(`\nNext: agentsam-bridge run`);
}

async function cmdRun(flags) {
  const cfg = await loadConfig();
  const workerUrl = flags.worker || cfg.WORKER_URL;
  const ptyToken = cfg.PTY_AUTH_TOKEN;
  const pairId = cfg.PAIR_ID;
  const userId = cfg.IAM_PTY_USER_ID;
  const workspaceId = cfg.IAM_PTY_WORKSPACE_ID;
  const port = Number(flags.port || cfg.PTY_PORT || 3099);

  if (!ptyToken || !workerUrl || !pairId) {
    throw new Error('Not paired yet — run: agentsam-bridge pair <CODE>');
  }

  const sessionId = `sess_${randomBytes(8).toString('hex')}`;
  const localWs = `ws://127.0.0.1:${port}/terminal`;

  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('agentsam-bridge PTY stub — connect via Work Mode user_hosted_tunnel\n');
  });

  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  console.log(`Bridge listening on http://127.0.0.1:${port}`);

  const tunnelUrl = localWs;
  await registerSession({
    workerUrl,
    ptyToken,
    sessionId,
    tunnelUrl,
    userId,
    workspaceId,
    shell: cfg.PLATFORM === 'windows' ? 'powershell' : 'bash',
  }).catch((e) => {
    console.warn(`session/register: ${e.message} (dev pairing may still complete)`);
  });

  await completePairing({
    workerUrl,
    pairId,
    ptyToken,
    wsUrl: tunnelUrl,
    tunnelUrl,
    sessionId,
  });

  console.log('✓ Bridge registered — return to Work Mode (lane: user_hosted_tunnel)');
  console.log('  Press Ctrl+C to stop');

  process.on('SIGINT', () => {
    server.close();
    process.exit(0);
  });
}

async function cmdStatus(flags) {
  const cfg = await loadConfig();
  const workerUrl = flags.worker || cfg.WORKER_URL || '';
  console.log('Local config:', Object.keys(cfg).length ? cfg : '(empty)');
  if (!workerUrl) {
    console.log('No WORKER_URL — run pair first');
    return;
  }
  try {
    const res = await fetch(`${workerUrl.replace(/\/$/, '')}/api/health`);
    const body = await res.json().catch(() => ({}));
    console.log(`Worker ${workerUrl}: ${res.ok ? 'ok' : res.status}`, body.status || '');
  } catch (e) {
    console.log(`Worker ${workerUrl}: unreachable (${e.message})`);
  }
}

export async function main(argv) {
  const { positional, flags } = parseArgs(argv);
  if (flags.help || !positional[0]) {
    usage();
    return;
  }
  const cmd = positional[0];
  if (cmd === 'pair') await cmdPair(positional, flags);
  else if (cmd === 'run') await cmdRun(flags);
  else if (cmd === 'status') await cmdStatus(flags);
  else throw new Error(`unknown command: ${cmd}`);
}
