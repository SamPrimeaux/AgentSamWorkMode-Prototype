# Cursor + Cloudflare setup

This repository includes the [official Cloudflare agent setup for Cursor](https://developers.cloudflare.com/agent-setup/cursor/) so every teammate and Cloud Agent gets the same Cloudflare tooling.

## What you get

| Layer | In this repo | One-time per developer |
|-------|----------------|------------------------|
| **MCP servers** | `.cursor/mcp.json` (committed) | Restart Cursor; OAuth on first use |
| **Skills** | Documented below | `/add-plugin cloudflare` or Marketplace |
| **Wrangler** | `wrangler.jsonc` + npm scripts | `npx wrangler login` for deploy |

## Quick start

### 1. Clone and install

```bash
git clone <repo-url>
cd <repo>
npm install
```

### 2. Open in Cursor

Cursor loads `.cursor/mcp.json` automatically. **Restart Cursor** after the first open so MCP servers register.

### 3. Install Cloudflare Skills (plugin)

In Cursor Agent chat:

```txt
/add-plugin cloudflare
```

Alternative paths:

- **Cursor Marketplace** → search **Cloudflare** → Install
- **Settings → Rules → Add Rule → Remote Rule (GitHub)** → `cloudflare/skills`

Skills teach the agent Workers, Wrangler, Durable Objects, Agents SDK, Sandbox, and related platform patterns. They load on demand and bias toward current Cloudflare docs.

### 4. Authorize MCP (first tool use)

The first time an agent calls a Cloudflare MCP tool (except `cloudflare-docs`, which is public), Cursor opens OAuth in your browser. Choose the account and permissions to grant.

Configured servers:

| Server | URL | Use when |
|--------|-----|----------|
| `cloudflare` | `https://mcp.cloudflare.com/mcp` | Broad API access (Code Mode, 2500+ endpoints) |
| `cloudflare-docs` | `https://docs.mcp.cloudflare.com/mcp` | Up-to-date product documentation |
| `cloudflare-bindings` | `https://bindings.mcp.cloudflare.com/mcp` | Workers, KV, R2, D1 bindings |
| `cloudflare-builds` | `https://builds.mcp.cloudflare.com/mcp` | Workers Builds CI/CD |
| `cloudflare-observability` | `https://observability.mcp.cloudflare.com/mcp` | Logs and analytics |

### 5. Wrangler (local deploy)

```bash
npx wrangler login          # once
npm run preview:worker      # local Workers dev
npm run deploy              # deploy agentsam-workmode-preview
```

Requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in GitHub secrets for CI (see `.github/workflows/deploy-preview.yml`).

## Project rules

Committed Cursor rules in `.cursor/rules/`:

- `cloudflare-platform.mdc` — Cloudflare deploy target, MCP usage, doc indexes
- `workmode-project.mdc` — This repo’s stack, scripts, and integration boundaries

`AGENTS.md` at the repo root summarizes the same for Cloud Agents and other tools.

## Example prompts

```txt
Deploy the Work Mode preview worker and confirm the build succeeded.
```

```txt
Review wrangler.jsonc and suggest bindings if we add D1 for workspace state.
```

```txt
Add real-time updates using Durable Objects with WebSocket hibernation.
```

Always @-mention `wrangler.jsonc` when changing Worker config or bindings.

## Troubleshooting

### MCP server not connecting

- Confirm `.cursor/mcp.json` is valid JSON: `npm run verify:cursor-mcp`
- Restart Cursor after editing MCP config

### Stale Cloudflare answers

- Ensure `cloudflare-docs` MCP is enabled (in `.cursor/mcp.json`)
- Or point the agent at https://developers.cloudflare.com/llms.txt

### Agent doesn’t know Workers APIs

- Install the Cloudflare plugin (`/add-plugin cloudflare`)
- @-mention `wrangler.jsonc` and relevant source files

## References

- [Cursor + Cloudflare docs](https://developers.cloudflare.com/agent-setup/cursor/)
- [Cloudflare Skills](https://github.com/cloudflare/skills)
- [MCP servers for Cloudflare](https://developers.cloudflare.com/agents/model-context-protocol/mcp-servers-for-cloudflare/)
- [Cursor MCP docs](https://cursor.com/docs/mcp)
