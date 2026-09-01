# AgentSamRemix Integration

Full integration branch: **`cursor/integrate-workmode-ui-8edb`**

Includes:
- Work Mode UI (`app/workmode/`)
- SDK CLI pin from GitHub + verb delegation
- MCP bridge manifest + `dist/mcp-bridge/manifest.json` build export
- **GitHub CLI (gh)** first-class Cmd+K catalog + `agentsam_gh_*` agent tools (`patches/0004-*.patch`)
- **Work Mode CF command palette** (`patches/0005-*.patch`)

## Push to AgentSamRemix remote (requires write access)

The cloud agent cannot push to `SamPrimeaux/AgentSamRemix` (403). From your machine:

```bash
git clone https://github.com/SamPrimeaux/AgentSamRemix.git
cd AgentSamRemix
curl -fsSL -o /tmp/integration.patch \
  https://raw.githubusercontent.com/SamPrimeaux/AgentSamWorkMode-Prototype/cursor/remix-integration-guide-8edb/patches/agentsamremix-full-integration.patch
git checkout -b cursor/integrate-workmode-ui-8edb
git am /tmp/integration.patch
npm ci && npm run verify:mcp-bridge && npm run build
git push -u origin cursor/integrate-workmode-ui-8edb
```

Or apply the patch files in `patches/` sequentially:

```bash
git am patches/0001-*.patch patches/0002-*.patch patches/0003-*.patch patches/0004-*.patch patches/0005-*.patch
```

## What landed in Remix

| Path | Purpose |
|------|---------|
| `app/workmode/WorkModePage.tsx` | Route entry — chat + work split layout |
| `app/workmode/components/` | Ported prototype UI |
| `app/workmode/hooks/useWorkModeGitBridge.ts` | Live git status |
| `app/workmode/hooks/useWorkModeTelemetryBridge.ts` | Telemetry poll |
| `app/workmode/hooks/useWorkModeShellBridge.ts` | Shell PTY via `IAM_TERMINAL_CONNECT` |
| `app/workmode/components/WorkModeCommandPalette.tsx` | CF + gh Cmd+K palette (patch `0005`) |

## GitHub CLI (gh) — apply + D1 seed

After applying patch `0004-feat-gh-cli-first-class-cmdk-and-agent-tools.patch`:

```bash
npm run test:gh
# Apply D1 migration (inneranimalmedia-business):
wrangler d1 execute inneranimalmedia-business --remote --file=migrations/1325_seed_gh_cli_commands_and_tools.sql
```

Cmd+K: type `>` or `/` and search `gh pr`, `gh run`, etc. Agent tools: `agentsam_gh_pr_list`, `agentsam_gh_run`, …

Terminal guide: `GET /api/terminal/gh-guide?lane=sandbox&status=1`

## Work Mode command palette (patch 0005)

After applying patches through `0004` (gh CLI) and `0005` (workmode palette):

```bash
git am patches/0005-feat-workmode-cf-command-palette.patch
npm run build
# /dashboard/workmode → ⌘K or Cloud button in header
```

## MCP server wiring (inneranimalmedia-mcp-server)

After build:

```bash
npm run build
# → dist/mcp-bridge/manifest.json
```

Import that manifest in **inneranimalmedia-mcp-server** to align schema twins and server URL
(`https://mcp.inneranimalmedia.com/mcp`).

See `docs/platform/mcp-server-wiring.md` in AgentSamRemix after applying the patch.

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
2. Push to `main` — workflow `.github/workflows/deploy-preview.yml` runs `wrangler deploy`
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

## Verify locally

```bash
npm run verify:sdk-cli
npm run verify:mcp-bridge
npm run test:bin-lib
npm run build
```
