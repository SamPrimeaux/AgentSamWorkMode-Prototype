# Auth, ExecOS & Platform Wiring Audit

This document maps **real production implementations** (AgentSamRemix Worker) vs the **standalone prototype** UI, and how this repo connects to them.

## Architecture overview

```text
Browser (Work Mode UI)
  ├─ Session cookies → /api/auth/session (IAM identity plane)
  ├─ Git status     → GET /api/agent/git/status?workspace_id=
  ├─ Terminal PTY   → WS /api/agent/terminal/ws?target_type=local|platform_vm|sandbox
  │                   └─ AgentChat DO → PTY_SERVICE (VPC) | localpty tunnel | ExecOS
  ├─ One-shot exec  → POST /api/agent/terminal/exec
  ├─ Artifacts      → GET /api/artifacts → R2 (ARTIFACTS bucket) + D1 metadata
  ├─ CMS / websites → GET /api/cms/pages, /api/cms/bootstrap → D1 + CMS_BUCKET (R2)
  └─ Google Drive   → /api/gdrive/*, /api/integrations/gdrive/* (OAuth tokens in D1)
```

## Authentication (production — AgentSamRemix)

| Component | Location | Notes |
|-----------|----------|-------|
| Login / session | `src/api/auth.js` | `POST /api/auth/login`, `GET /api/auth/session` |
| OAuth providers | `src/api/oauth.js` | GitHub, Google, Cloudflare, Supabase |
| IAM client | `wrangler.jsonc` | `IAM_CLIENT_ID`, cookie session on `agentsamremix.inneranimalmedia.com` |
| ExecOS bridge key | `backend/auth/bridge-key-auth.js` | Machine auth for ingest / privileged ops |
| Session cache | KV `SESSION_CACHE` | OAuth state acceleration |

**Prototype:** No auth routes. When `VITE_IAM_ORIGIN` points at the Worker, the dev proxy forwards cookies; user must sign in on the Worker origin first (or embed Work Mode inside Remix shell).

## ExecOS vs PTY lanes

| Lane | Runtime | Use case |
|------|---------|----------|
| `platform_vm` | `PTY_SERVICE` VPC binding | Default cloud interactive shell |
| `local` | `localpty.inneranimalmedia.com` tunnel | Mac ExecOS daemon (port 3099) |
| `sandbox` | `MY_CONTAINER` / Sandbox DO | Isolated agent commands |
| ExecOS fabric | `EXECOS` service binding | One-shot privileged Mac commands (not default PTY) |

Key files:
- `src/core/execos-fabric.js` — dispatch to ExecOS worker
- `backend/agentsam/terminal/execos.ts` — probe + `callExecOS`
- `backend/http/agentsam/routes/execos-merkle-runtime.js` — local git walk on Mac
- `docs/runtime/terminal-vpc.md` — full PTY flow

**Shell bridge (Remix shell):** `IAM_TERMINAL_CONNECT` custom event → `useTerminalLaneConnect` → real xterm WebSocket.

## Git / GitHub (production)

| Endpoint | Handler | Purpose |
|----------|---------|---------|
| `GET /api/agent/git/status` | `git-status-runtime.js` | Branch, staged/unstaged files, ahead/behind |
| `POST /api/agent/git/branch` | `git-terminal.js` | Checkout branch |
| `GET /api/agent/github/repos` | `src/integrations/github.js` | Repo list (OAuth token) |
| `GET /api/integrations/github/files` | `src/api/integrations.js` | File tree / contents |
| Agent tools | `catalog-tool-github.js` | `agentsam_github_*` via MCP |
| gh CLI tools | `migrations/1325_*` | `agentsam_gh_*` + Cmd+K catalog |

## Artifacts & presentations

| Endpoint | Storage | Notes |
|----------|---------|-------|
| `GET /api/artifacts` | D1 `agentsam_artifacts` + R2 | List user artifacts |
| `GET /api/artifacts/:id/content` | R2 via `artifact-r2-store.js` | Slide decks, HTML, images |
| `POST /api/draw` | R2 `artifacts` bucket | Generated images |
| `/api/moviemode/*` | R2 + D1 | Video / deck projects |

Presentation slides in Work Mode map from artifacts where `artifact_type` ∈ `presentation`, `deck`, `markdown`, `html`.

## CMS & websites

| Endpoint | Storage | Notes |
|----------|---------|-------|
| `GET /api/cms/pages?project_id=` | D1 CMS tables | Page list |
| `GET /api/cms/bootstrap?project_slug=` | D1 + R2 draft HTML | Editor bootstrap |
| `POST /api/cms/pages` | D1 + R2 | Create page |
| Publish | `executeCmsPagePublish` | D1 + `CMS_BUCKET` R2 |

Cloudflare adapter: `src/core/agentsam/cms/adapters/cloudflare/storage.js` (`CMS_BUCKET` binding).

## Storage adapter pattern (this prototype)

Work Mode uses a **pluggable storage backend** for brand assets and CMS drafts:

| Backend | Env | API surface |
|---------|-----|-------------|
| `local` | Dev only | `localStorage` + optional `POST /api/storage/local/*` |
| `cloudflare` | Production default | `/api/artifacts`, `/api/cms/*`, `/api/r2/*` |
| `gdrive` | Optional BYOK | `/api/gdrive/*`, `/api/integrations/gdrive/*` |

Set `VITE_STORAGE_BACKEND=cloudflare|gdrive|local` (default: `cloudflare` when IAM origin set, else `local`).

## Prototype configuration

```bash
# .env — point UI at production Worker (recommended for real wiring)
VITE_IAM_ORIGIN=https://agentsamremix.inneranimalmedia.com
VITE_WORKSPACE_ID=your_workspace_uuid
VITE_STORAGE_BACKEND=cloudflare

# Dev server proxies /api/* → VITE_IAM_ORIGIN (see server.ts)
GEMINI_API_KEY=...   # optional local chat fallback
```

## Embedding in AgentSamRemix (full experience)

Apply patches `0001`–`0005` or use branch `cursor/integrate-workmode-ui-8edb`. Remix provides:
- Real session cookies
- `useWorkModeShellBridge` → dashboard PTY
- `useWorkModeGitBridge` → live git
- `WorkspaceContext.workspaceId`

Standalone preview (`agentsam-workmode-preview` Worker) remains static UI + proxy; auth requires IAM origin.

## Implementation in this repo

| Module | Role |
|--------|------|
| `src/lib/apiClient.ts` | `apiFetch` with credentials + IAM origin |
| `src/hooks/useGitBridge.ts` | Polls git status |
| `src/hooks/useShellBridge.ts` | `IAM_TERMINAL_CONNECT` events |
| `src/hooks/useTerminalBridge.ts` | Config status + exec + optional WS log stream |
| `src/hooks/useArtifactsBridge.ts` | Loads decks + brand from `/api/artifacts` |
| `src/hooks/useCmsBridge.ts` | Loads website from `/api/cms/bootstrap` |
| `src/lib/storage/*` | local / cloudflare / gdrive adapters |
| `src/contexts/PlatformContext.tsx` | Workspace + storage backend selection |
