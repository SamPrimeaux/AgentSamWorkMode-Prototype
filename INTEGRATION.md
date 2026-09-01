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
