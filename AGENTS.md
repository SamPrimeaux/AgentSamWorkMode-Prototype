# Agent instructions (Cursor, Cloud Agents, Copilot)

This repo follows the official [Cursor + Cloudflare](https://developers.cloudflare.com/agent-setup/cursor/) agent setup.

## One-time developer setup

1. **Install Cursor** — https://cursor.com/downloads
2. **Install Cloudflare plugin** — In Cursor chat run:
   ```
   /add-plugin cloudflare
   ```
   Or: Cursor Marketplace → **Cloudflare** (installs Skills + documents MCP servers).
3. **MCP servers** — Already committed in `.cursor/mcp.json`. Restart Cursor after clone. OAuth runs in the browser on first Cloudflare tool use.
4. **Wrangler auth** (for local deploy): `npx wrangler login`
5. **Optional platform APIs**: `cp .env.example .env` and set `VITE_IAM_ORIGIN`

## What is configured in-repo

| Artifact | Purpose |
|----------|---------|
| `.cursor/mcp.json` | Team-shared Cloudflare MCP servers (API, docs, bindings, builds, observability) |
| `.cursor/rules/*.mdc` | Project + Cloudflare context for every agent turn |
| `wrangler.jsonc` | Worker `agentsam-workmode-preview`, SPA assets from `dist/` |
| `.github/workflows/deploy-preview.yml` | CI deploy to Workers on `main` |

## Skills, MCP, and Wrangler

Use all three together:

- **Skills** — Domain knowledge (Workers, D1, R2, Agents SDK, Wrangler). Loaded via the Cloudflare plugin.
- **MCP** — Live API and docs at runtime. Configured in `.cursor/mcp.json`.
- **Wrangler** — `npm run deploy`, `npm run preview:worker`, and commands in `src/lib/wranglerCommandCatalog.ts`.

## Common tasks

```bash
# Local full stack
npm install && npm run dev

# Worker preview (static UI on Workers)
npm run preview:worker

# Deploy preview worker
npm run deploy

# Typecheck
npm run lint
```

## Prompt tips

- @-mention `wrangler.jsonc` when changing deploy or bindings.
- For Cloudflare API behavior, prefer `cloudflare-docs` MCP over stale training data.
- For deploy/debug issues, use `cloudflare-builds` and `cloudflare-observability` MCP tools.
- Integration with AgentSamRemix: see `INTEGRATION.md` and `docs/AUTH_EXECOS_WIRING.md`.

## Further reading

- Setup guide: `docs/CURSOR_CLOUDFLARE_SETUP.md`
- Cloudflare agent setup index: https://developers.cloudflare.com/agent-setup/
- Cloudflare Skills repo: https://github.com/cloudflare/skills
