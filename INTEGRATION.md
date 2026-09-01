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
