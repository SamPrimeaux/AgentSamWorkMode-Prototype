# AgentSamRemix Integration

Work Mode has been integrated into **AgentSamRemix** on branch
`cursor/integrate-workmode-ui-8edb`.

## Apply to AgentSamRemix

```bash
cd AgentSamRemix
git fetch origin
git checkout -b cursor/integrate-workmode-ui-8edb
git am /path/to/0001-feat-workmode-integrate-AgentSamWorkMode-prototype-U.patch
npm install
npm run dev
# → Create → Work Mode  or  /dashboard/workmode
```

A copy of the patch lives in this repo at `patches/remix-workmode-integration.patch`.

## What landed in Remix

| Path | Purpose |
|------|---------|
| `app/workmode/WorkModePage.tsx` | Route entry — chat + work split layout |
| `app/workmode/components/` | Ported prototype UI |
| `app/workmode/hooks/useWorkModeGitBridge.ts` | Live git status |
| `app/workmode/hooks/useWorkModeTelemetryBridge.ts` | Telemetry poll |
| `app/workmode/hooks/useWorkModeShellBridge.ts` | Shell PTY via `IAM_TERMINAL_CONNECT` |
| `app/workmode/components/WorkModeCommandPalette.tsx` | CF + gh Cmd+K palette (patch `0005`) |

## Work Mode command palette (patch 0005)

After applying patches through `0004` (gh CLI) and `0005` (workmode palette):

```bash
git am patches/0005-feat-workmode-cf-command-palette.patch
npm run build
# /dashboard/workmode → ⌘K or Cloud button in header
```

## Real vs mock

| Surface | Status |
|---------|--------|
| Git branch + changed files | Live when authenticated |
| Telemetry tab | Local runs + `/api/agent/telemetry` |
| Terminal | Opens shell PTY; drawer shows agent logs |
| Chat / presentations / brand | Prototype engine (next: `/api/agent/chat` SSE) |

## Next wiring targets

1. Route chat through `/api/agent/chat` (shell AgentSamChatHost)
2. PR review → GitHub API + `ApprovalUnifiedDiff`
3. Browser cards → `@iam/frontend/workbench/browser`
4. Presentations/websites → CMS + moviemode APIs

See `app/workmode/README.md` in AgentSamRemix after applying the patch.

## Preview the standalone Work Mode UI

The Vite prototype in this repo can be deployed as a static SPA on Cloudflare Workers.

### Local

```bash
npm install
npm run dev          # full stack (Vite + express)
npm run build:static && npm run preview   # static build only
```

### Deploy (your Cloudflare account)

1. Add GitHub repo secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
2. Push to `main` (or merge `cursor/deploy-workmode-preview-8edb`) — workflow `.github/workflows/deploy-preview.yml` runs `wrangler deploy`
3. Or locally: `npm run deploy` after `wrangler login`

Worker name: `agentsam-workmode-preview` → `https://agentsam-workmode-preview.<subdomain>.workers.dev`

### Patches in this repo

| Patch | Purpose |
|-------|---------|
| `0001` | Full Work Mode integration into AgentSamRemix |
| `0002` | CLI pin + SDK forward |
| `0003` | MCP bridge manifest |
| `0004` | gh CLI Cmd+K + agent tools |
| `0005` | Work Mode CF command palette |
