export async function claimPairingCode({ workerUrl, code, deviceName, platform, shell }) {
  const res = await fetch(`${workerUrl.replace(/\/$/, '')}/api/terminal/pair/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      code: code.replace(/[^A-Za-z0-9]/g, '').toUpperCase(),
      device_name: deviceName,
      platform,
      shell,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `claim failed (${res.status})`);
  }
  return body;
}

export async function completePairing({ workerUrl, pairId, ptyToken, wsUrl, tunnelUrl, sessionId }) {
  const res = await fetch(`${workerUrl.replace(/\/$/, '')}/api/terminal/pair/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${ptyToken}`,
    },
    body: JSON.stringify({
      pair_id: pairId,
      ws_url: wsUrl,
      tunnel_url: tunnelUrl,
      session_id: sessionId,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `complete failed (${res.status})`);
  }
  return body;
}

export async function registerSession({
  workerUrl,
  ptyToken,
  sessionId,
  tunnelUrl,
  userId,
  workspaceId,
  cols = 220,
  rows = 50,
  shell = '/bin/bash',
  cwd = '',
}) {
  const res = await fetch(`${workerUrl.replace(/\/$/, '')}/api/terminal/session/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${ptyToken}`,
    },
    body: JSON.stringify({
      session_id: sessionId,
      tunnel_url: tunnelUrl,
      user_id: userId,
      workspace_id: workspaceId,
      cols,
      rows,
      shell,
      cwd,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `register failed (${res.status})`);
  }
  return body;
}
