import type { WorkDiffSession } from '../lib/workdiff/interactions';

const cloudflarePlatformMdc = `---
description: Cloudflare platform conventions for Workers deploys, Wrangler, and MCP tools in this repo.
alwaysApply: true
---

# Cloudflare platform (Cursor + Cloudflare)

This repo is wired for the official [Cursor + Cloudflare agent setup](https://developers.cloudflare.com/agent-setup/cursor/).

## Three layers (use together)

1. **Skills** — Install the Cloudflare plugin once per developer: \`/add-plugin cloudflare\` in Cursor.
2. **MCP servers** — Project config lives in \`.cursor/mcp.json\` (OAuth on first tool use).
3. **Wrangler CLI** — Local dev and deploy: \`npm run preview:worker\`, \`npm run deploy\`.

## Agent-friendly docs

- Global index: https://developers.cloudflare.com/llms.txt
- Workers: https://developers.cloudflare.com/workers/llms.txt
- Agents: https://developers.cloudflare.com/agents/llms.txt

## Deploy target

- Worker name: \`agentsam-workmode-preview\` (see \`wrangler.jsonc\`)
- Static assets build: \`npm run build:static\` then \`wrangler deploy\`
- CI: \`.github/workflows/deploy-preview.yml\` on push to \`main\`

When editing Workers or Cloudflare resources, @-mention \`wrangler.jsonc\` in prompts.
`;

const mcpJson = `{
  "mcpServers": {
    "cloudflare": {
      "url": "https://mcp.cloudflare.com/mcp"
    },
    "cloudflare-docs": {
      "url": "https://docs.mcp.cloudflare.com/mcp"
    },
    "cloudflare-bindings": {
      "url": "https://bindings.mcp.cloudflare.com/mcp"
    },
    "cloudflare-builds": {
      "url": "https://builds.mcp.cloudflare.com/mcp"
    },
    "cloudflare-observability": {
      "url": "https://observability.mcp.cloudflare.com/mcp"
    }
  }
}
`;

function addedLines(content: string) {
  return content.split('\n').map((line, i) => ({
    type: 'add' as const,
    newLine: i + 1,
    content: line,
  }));
}

export const MOCK_WORK_DIFF_SESSION: WorkDiffSession = {
  externalPrUrl: 'https://github.com/SamPrimeaux/AgentSamWorkMode-Prototype/pull/9',
  agentSummary:
    'If you want to go toward a real editor, the natural first step would be lazy-loaded Monaco (or CodeMirror 6 for smaller bundle) inside WorkbenchDiffSheet for read-only diffs, then a separate edit surface later. For mobile, Kumo CodeHighlighted is the better default — review-first, no full IDE.',
  mergedAt: 'September 1, 2026 at 2:48 PM',
  mergedBy: 'SamPrimeaux',
  commits: [
    {
      sha: '972ff1b8c4e21a9f0d3e7b2a1c5f8d0e3a7b9c1',
      shortSha: '972ff1b',
      message: 'feat(cursor): add Cloudflare agent setup for Cursor and Cloud Agents',
      author: 'Cursor Agent',
      timestamp: '4h ago',
    },
  ],
  pr: {
    id: 'pr-9',
    number: 9,
    title: 'feat(cursor): add Cloudflare agent setup for Cursor and Cloud Agents',
    branch: 'cursor/cloudflare-agent-setup-2b02',
    targetBranch: 'main',
    author: 'SamPrimeaux',
    status: 'merged',
    createdAt: '4h ago',
    updatedAt: '4h ago',
    summary: 'Integrates the official Cursor + Cloudflare agent setup into this repo.',
    additions: 275,
    deletions: 1,
    specMarkdown: `## Summary

Integrates the official [Cursor + Cloudflare agent setup](https://developers.cloudflare.com/agent-setup/cursor/) into this repo so teammates and Cloud Agents get consistent Cloudflare tooling out of the box.

## What's included

- **\`.cursor/mcp.json\`** — Team-shared Cloudflare MCP servers
- **\`.cursor/rules/\`** — Project and platform rules for Cursor agents
- **\`AGENTS.md\`** — Quick agent onboarding reference
- **\`docs/CURSOR_CLOUDFLARE_SETUP.md\`** — Full setup and troubleshooting guide
- **\`npm run verify:cursor-mcp\`** — Validates MCP config JSON

## Developer one-time steps

1. Run \`/add-plugin cloudflare\` in Cursor
2. Restart Cursor after clone
3. Complete OAuth on first Cloudflare MCP tool use
4. \`npx wrangler login\` for local deploys`,
    files: [
      {
        id: 'f-agents',
        filename: 'AGENTS.md',
        path: 'AGENTS.md',
        status: 'added',
        additions: 61,
        deletions: 0,
        diffLines: addedLines('# Agent instructions\n\n...'),
      },
      {
        id: 'f-cf-rule',
        filename: 'cloudflare-platform.mdc',
        path: '.cursor/rules/cloudflare-platform.mdc',
        status: 'added',
        additions: 29,
        deletions: 0,
        diffLines: addedLines(cloudflarePlatformMdc),
      },
      {
        id: 'f-cf-docs',
        filename: 'CURSOR_CLOUDFLARE_SETUP.md',
        path: 'docs/CURSOR_CLOUDFLARE_SETUP.md',
        status: 'added',
        additions: 113,
        deletions: 0,
        diffLines: addedLines('# Cursor + Cloudflare setup\n\n...'),
      },
      {
        id: 'f-integration',
        filename: 'INTEGRATION.md',
        path: 'INTEGRATION.md',
        status: 'modified',
        additions: 13,
        deletions: 0,
        diffLines: addedLines('## Cursor + Cloudflare agent setup\n\n...'),
      },
      {
        id: 'f-mcp',
        filename: 'mcp.json',
        path: '.cursor/mcp.json',
        status: 'added',
        additions: 19,
        deletions: 0,
        diffLines: addedLines(mcpJson),
      },
      {
        id: 'f-pkg',
        filename: 'package.json',
        path: 'package.json',
        status: 'modified',
        additions: 2,
        deletions: 1,
        diffLines: [
          { type: 'header', content: '@@ -15,6 +15,7 @@' },
          { type: 'normal', oldLine: 16, newLine: 16, content: '    "lint": "tsc --noEmit",' },
          {
            type: 'add',
            newLine: 17,
            content: '    "verify:cursor-mcp": "node ..."',
          },
        ],
      },
      {
        id: 'f-workmode',
        filename: 'workmode-project.mdc',
        path: '.cursor/rules/workmode-project.mdc',
        status: 'added',
        additions: 38,
        deletions: 0,
        diffLines: addedLines('# Work Mode prototype\n\n...'),
      },
    ],
  },
};
