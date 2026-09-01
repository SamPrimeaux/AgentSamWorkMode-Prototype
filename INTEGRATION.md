# AgentSamRemix Integration

Full integration branch: **`cursor/integrate-workmode-ui-8edb`**

Includes:
- Work Mode UI (`app/workmode/`)
- SDK CLI pin from GitHub + verb delegation
- MCP bridge manifest + `dist/mcp-bridge/manifest.json` build export
- **GitHub CLI (gh)** first-class Cmd+K catalog + `agentsam_gh_*` agent tools (`patches/0004-*.patch`)

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
git am patches/0001-*.patch patches/0002-*.patch patches/0003-*.patch patches/0004-*.patch
```

## GitHub CLI (gh) — apply + D1 seed

After applying patch `0004-feat-gh-cli-first-class-cmdk-and-agent-tools.patch`:

```bash
npm run test:gh
# Apply D1 migration (inneranimalmedia-business):
wrangler d1 execute inneranimalmedia-business --remote --file=migrations/1325_seed_gh_cli_commands_and_tools.sql
```

Cmd+K: type `>` or `/` and search `gh pr`, `gh run`, etc. Agent tools: `agentsam_gh_pr_list`, `agentsam_gh_run`, …

Terminal guide: `GET /api/terminal/gh-guide?lane=sandbox&status=1`

## MCP server wiring (inneranimalmedia-mcp-server)

After build:

```bash
npm run build
# → dist/mcp-bridge/manifest.json
```

Import that manifest in **inneranimalmedia-mcp-server** to align schema twins and server URL
(`https://mcp.inneranimalmedia.com/mcp`).

See `docs/platform/mcp-server-wiring.md` in AgentSamRemix after applying the patch.

## Verify locally

```bash
npm run verify:sdk-cli
npm run verify:mcp-bridge
npm run test:bin-lib
npm run build
```
