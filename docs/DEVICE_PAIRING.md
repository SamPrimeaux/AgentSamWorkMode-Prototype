# Device pairing & agentsam-bridge CLI

Pair your local machine (localhost, Docker, or Cloudflare tunnel) with Work Mode using a **one-time code** — no manual `.env` copy.

## Flow

```text
Browser (Work Mode)                Your machine
─────────────────────              ─────────────────────────────
Connect machine →
  POST /api/terminal/pair/start
  shows ABCD-1234 + CLI command  →  npx agentsam-bridge pair ABCD-1234
                                    saves ~/.agentsam/bridge.env
                                    agentsam-bridge run
                                      → session/register + pair/complete
Poll GET /api/terminal/pair/status
  status: connected              ←  bridge live on :3099
xterm uses user_hosted_tunnel (default lane)
```

## UI

- **Connect machine** button in Work Mode header and terminal drawer
- **ConnectMachineSheet** — pairing code, countdown, CLI command copy
- **Terminal lane** defaults to `user_hosted_tunnel` (your machine)

## CLI (`packages/agentsam-bridge`)

```bash
# From repo root
npm run bridge -- pair ABCD-1234 --worker http://localhost:3000
npm run bridge -- run
npm run bridge -- status
```

Commands:

| Command | Description |
|---------|-------------|
| `pair <CODE>` | Claim browser pairing code; writes `~/.agentsam/bridge.env` |
| `run` | Start local bridge stub on `:3099`, register with Worker |
| `status` | Show local config + worker health |

## API (prototype dev server + AgentSamRemix patch)

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/terminal/pair/start` | IAM session cookie |
| GET | `/api/terminal/pair/status?pair_id=` | IAM session |
| POST | `/api/terminal/pair/claim` | Code only (CLI) |
| POST | `/api/terminal/pair/complete` | `Bearer` PTY token |
| DELETE | `/api/terminal/pair/:pair_id` | IAM session |

Prototype `server.ts` mounts a **local in-memory store** for `/api/terminal/pair/*` before the IAM proxy so pairing works without Worker deploy.

Production: apply `patches/0006-feat-device-pairing-bridge.patch` to AgentSamRemix (KV-backed, issues real `PTY_AUTH_TOKEN` via `generateUserPtyAuthToken`).

## xterm + Monaco (standalone prototype)

- **Terminal drawer → Shell (xterm)** uses `@xterm/xterm` + FitAddon; connects to IAM WS or local bridge fallback.
- **Code button / Files tab** opens Monaco editor backed by `agentsam-bridge` filesystem (`/api/bridge/fs/*`).
- Start bridge: `npm run bridge -- run` (PTY on `:3099` + file API).


- Users never receive `AGENTSAM_BRIDGE_KEY`
- Per-device `PTY_AUTH_TOKEN` encrypted in D1 `user_secrets`
- Pairing codes expire in 10 minutes

## Env

```bash
VITE_IAM_ORIGIN=https://agentsamremix.inneranimalmedia.com
VITE_WORKSPACE_ID=<uuid>
# Dev pairing without IAM auth (prototype only):
MOCK_PAIR_USER_ID=dev_user
```
