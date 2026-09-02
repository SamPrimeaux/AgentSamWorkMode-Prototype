# WorkDiff mobile UX

Mobile-first review flow for agent-completed work. Mirrors Cursor/GitHub mobile PR inspection — **review, not edit**.

## Interaction zones

| Zone | Surface | Gesture | Primary action |
|------|---------|---------|----------------|
| `chat_thread` | Agent summary text | Scroll | Read outcome |
| `changes_card` | Compact file list in chat | Tap | Open changes sheet |
| `changes_sheet` | iOS bottom sheet | Swipe down | Expand file |
| `file_expand` | Inline read-only diff | Tap chevron | Verify code |
| `file_row_menu` | Per-file `···` | Tap | Copy path |
| `pr_overview` | Full-screen PR | Tap View PR | Review metadata |
| `pr_tab_overview` | Summary + spec markdown | Tap tab | Read plan |
| `pr_tab_discussion` | Comments (future) | Tap tab | Review thread |
| `pr_tab_commits` | Commit list | Tap tab | Inspect SHAs |
| `primary_actions` | View PR / Merge | Tap pill | Ship or escalate |
| `composer` | Follow up bar | Type / mic | Steer next phase |

## iOS layout tokens

Defined in `src/lib/workdiff/iosMetrics.ts`:

- **44pt** minimum touch target (`IOS_TOUCH_MIN`)
- **52pt** list rows (`IOS_LIST_ROW`)
- **20pt** sheet corner radius
- **Safe area** insets via `env(safe-area-inset-*)`
- SF Pro–like type scale (`IOS_TYPE`)

## Component map

```
WorkDiffChatChangesView          ← orchestrator (chat + card + composer)
├── WorkDiffChangesCard          ← teaser in thread
├── WorkDiffChangesSheet         ← bottom sheet file list
│   ├── WorkDiffFileRow
│   └── WorkDiffFileDiffBlock    ← read-only diff (no Monaco)
└── WorkDiffPrOverview           ← PR detail + tabs
```

## Rendering strategy

| Need | Tool | Notes |
|------|------|-------|
| Mobile diff review | `WorkDiffFileDiffBlock` | Colored rows, line numbers |
| Syntax polish (later) | Kumo `CodeHighlighted` | Lazy Shiki ~75KB |
| Full editing | `WorkbenchEditor` + Monaco | Desktop / paired machine only |

Monaco is **not** loaded in the WorkDiff path.

## Entry points

- **Inspector → Review changes (N)** in `AgentSamWorkMode`
- Mock session: `src/data/mockWorkDiffSession.ts` (Cloudflare PR #9 shape)

## Wiring live data (next)

1. Agent completion emits `WorkDiffSession` (branch, files, diff hunks, commits).
2. Replace `MOCK_WORK_DIFF_SESSION` with API/git bridge payload.
3. `onSquashAndMerge` → `gh pr merge` or platform PR API.
