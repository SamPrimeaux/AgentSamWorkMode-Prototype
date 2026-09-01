/**
 * Canonical GitHub CLI (gh) commands for Cmd+K / agentsam_commands (platform scope).
 * Keep in sync with migrations/1325_seed_gh_cli_commands_and_tools.sql
 */

export type GhCommandCategory =
  | 'auth'
  | 'pr'
  | 'issue'
  | 'repo'
  | 'run'
  | 'workflow'
  | 'release'
  | 'api'
  | 'codespace'
  | 'general';

export type GhCatalogEntry = {
  id: string;
  slug: string;
  display_name: string;
  category: GhCommandCategory;
  mapped_command: string;
  description?: string;
  risk_level?: 'low' | 'medium' | 'high';
  requires_confirmation?: boolean;
  sort_order?: number;
};

const destructive = /\b(delete|close|merge|cancel|archive|remove|revoke)\b/i;
const write = /\b(create|push|edit|update|fork|upload|trigger|approve|add|comment|review)\b/i;

function riskFor(cmd: string): 'low' | 'medium' | 'high' {
  if (destructive.test(cmd)) return 'high';
  if (write.test(cmd)) return 'medium';
  return 'low';
}

function entry(
  category: GhCommandCategory,
  slug: string,
  display_name: string,
  mapped_command: string,
  sort_order: number,
  description?: string,
): GhCatalogEntry {
  const risk_level = riskFor(mapped_command);
  return {
    id: `cmd_gh_${slug.replace(/\//g, '_')}`,
    slug: `/gh/${slug}`,
    display_name,
    category,
    mapped_command,
    description,
    risk_level,
    requires_confirmation: risk_level !== 'low',
    sort_order,
  };
}

/** User-facing section labels (Cmd+K grouping). */
export const GH_CATEGORY_LABELS: Record<GhCommandCategory, string> = {
  auth: 'Auth & setup',
  pr: 'Pull requests',
  issue: 'Issues',
  repo: 'Repositories',
  run: 'Actions runs',
  workflow: 'Workflows',
  release: 'Releases',
  api: 'GitHub API',
  codespace: 'Codespaces',
  general: 'General',
};

export const GH_COMMAND_CATALOG: GhCatalogEntry[] = [
  // Auth
  entry('auth', 'auth-status', 'Auth status', 'gh auth status', 1, 'Verify gh login / token scopes.'),
  entry('auth', 'auth-login', 'Login (browser)', 'gh auth login', 2, 'Interactive OAuth — local PTY only.'),
  entry(
    'auth',
    'auth-login-token',
    'Login (token)',
    'gh auth login --with-token',
    3,
    'Pipe GH_TOKEN on stdin for headless / CI.',
  ),
  entry('auth', 'auth-token', 'Print token', 'gh auth token', 4, 'Requires gh auth with token scope.'),
  entry('auth', 'auth-logout', 'Logout', 'gh auth logout', 5),
  entry('auth', 'auth-setup-git', 'Setup git credentials', 'gh auth setup-git', 6),
  entry('auth', 'auth-refresh', 'Refresh scopes', 'gh auth refresh', 7),

  // Pull requests
  entry('pr', 'pr-list', 'PR list', 'gh pr list --limit 30', 10),
  entry('pr', 'pr-list-json', 'PR list (JSON)', 'gh pr list --json number,title,state,author,headRefName,baseRefName', 11),
  entry('pr', 'pr-view', 'PR view', 'gh pr view <NUMBER>', 12),
  entry('pr', 'pr-view-web', 'PR view in browser', 'gh pr view <NUMBER> --web', 13),
  entry('pr', 'pr-diff', 'PR diff', 'gh pr diff <NUMBER>', 14),
  entry('pr', 'pr-checkout', 'PR checkout', 'gh pr checkout <NUMBER>', 15),
  entry('pr', 'pr-create', 'PR create', 'gh pr create --fill', 16, 'Opens editor or uses --title/--body flags.'),
  entry(
    'pr',
    'pr-create-draft',
    'PR create (draft)',
    'gh pr create --draft --fill',
    17,
  ),
  entry('pr', 'pr-merge', 'PR merge', 'gh pr merge <NUMBER> --merge', 18),
  entry('pr', 'pr-merge-squash', 'PR merge (squash)', 'gh pr merge <NUMBER> --squash', 19),
  entry('pr', 'pr-review', 'PR review', 'gh pr review <NUMBER> --approve', 20),
  entry('pr', 'pr-comment', 'PR comment', 'gh pr comment <NUMBER> --body "<COMMENT>"', 21),
  entry('pr', 'pr-checks', 'PR checks', 'gh pr checks <NUMBER>', 22),
  entry('pr', 'pr-status', 'PR status (current branch)', 'gh pr status', 23),

  // Issues
  entry('issue', 'issue-list', 'Issue list', 'gh issue list --limit 30', 30),
  entry('issue', 'issue-view', 'Issue view', 'gh issue view <NUMBER>', 31),
  entry('issue', 'issue-create', 'Issue create', 'gh issue create --title "<TITLE>" --body "<BODY>"', 32),
  entry('issue', 'issue-comment', 'Issue comment', 'gh issue comment <NUMBER> --body "<COMMENT>"', 33),
  entry('issue', 'issue-close', 'Issue close', 'gh issue close <NUMBER>', 34),

  // Repos
  entry('repo', 'repo-view', 'Repo view', 'gh repo view', 40),
  entry('repo', 'repo-view-json', 'Repo view (JSON)', 'gh repo view --json name,owner,defaultBranchRef,url', 41),
  entry('repo', 'repo-clone', 'Repo clone', 'gh repo clone <OWNER/REPO>', 42),
  entry('repo', 'repo-fork', 'Repo fork', 'gh repo fork <OWNER/REPO> --clone', 43),
  entry('repo', 'repo-create', 'Repo create', 'gh repo create <NAME> --private --source=.', 44),
  entry('repo', 'repo-sync', 'Repo sync fork', 'gh repo sync', 45),

  // Actions runs
  entry('run', 'run-list', 'Workflow runs list', 'gh run list --limit 20', 50),
  entry('run', 'run-view', 'Run view', 'gh run view <RUN_ID>', 51),
  entry('run', 'run-watch', 'Run watch', 'gh run watch <RUN_ID>', 52),
  entry('run', 'run-rerun', 'Run rerun', 'gh run rerun <RUN_ID>', 53),
  entry('run', 'run-cancel', 'Run cancel', 'gh run cancel <RUN_ID>', 54),
  entry('run', 'run-download', 'Run download artifacts', 'gh run download <RUN_ID>', 55),
  entry('run', 'run-log', 'Run logs', 'gh run view <RUN_ID> --log', 56),

  // Workflows
  entry('workflow', 'workflow-list', 'Workflow list', 'gh workflow list', 60),
  entry('workflow', 'workflow-view', 'Workflow view', 'gh workflow view <WORKFLOW>', 61),
  entry('workflow', 'workflow-run', 'Trigger workflow', 'gh workflow run <WORKFLOW>', 62),
  entry('workflow', 'workflow-enable', 'Enable workflow', 'gh workflow enable <WORKFLOW>', 63),
  entry('workflow', 'workflow-disable', 'Disable workflow', 'gh workflow disable <WORKFLOW>', 64),

  // Releases
  entry('release', 'release-list', 'Release list', 'gh release list --limit 20', 70),
  entry('release', 'release-view', 'Release view', 'gh release view <TAG>', 71),
  entry(
    'release',
    'release-create',
    'Release create',
    'gh release create <TAG> --generate-notes',
    72,
  ),
  entry('release', 'release-upload', 'Release upload', 'gh release upload <TAG> <FILE>', 73),
  entry('release', 'release-delete', 'Release delete', 'gh release delete <TAG>', 74),

  // GitHub API
  entry('api', 'api-user', 'API — current user', 'gh api user', 80),
  entry('api', 'api-repos', 'API — list repos', 'gh api user/repos --paginate', 81),
  entry('api', 'api-prs', 'API — list PRs', 'gh api repos/{owner}/{repo}/pulls', 82),
  entry(
    'api',
    'api-graphql',
    'API — GraphQL',
    'gh api graphql -f query=\'{ viewer { login } }\'',
    83,
  ),

  // Codespaces
  entry('codespace', 'codespace-list', 'Codespace list', 'gh codespace list', 90),
  entry('codespace', 'codespace-create', 'Codespace create', 'gh codespace create', 91),
  entry('codespace', 'codespace-ssh', 'Codespace SSH', 'gh codespace ssh -c <CODESPACE>', 92),
  entry('codespace', 'codespace-stop', 'Codespace stop', 'gh codespace stop -c <CODESPACE>', 93),

  // General
  entry('general', 'version', 'Version', 'gh --version', 100),
  entry('general', 'help', 'Help', 'gh help', 101),
  entry('general', 'browse', 'Open repo in browser', 'gh browse', 102),
  entry('general', 'gist-create', 'Create gist', 'gh gist create <FILE>', 103),
  entry('general', 'label-list', 'Label list', 'gh label list', 104),
  entry('general', 'search-code', 'Search code', 'gh search code "<QUERY>" --limit 20', 105),
  entry('general', 'search-repos', 'Search repos', 'gh search repos "<QUERY>" --limit 20', 106),
];

export function filterGhCatalog(term: string, limit = 80): GhCatalogEntry[] {
  const t = term.trim().toLowerCase();
  const rows = !t
    ? GH_COMMAND_CATALOG
    : GH_COMMAND_CATALOG.filter((c) => {
        const hay = `${c.display_name} ${c.mapped_command} ${c.category} ${c.slug}`.toLowerCase();
        return hay.includes(t);
      });
  return rows.slice(0, limit);
}

export function groupGhCatalog(
  rows: GhCatalogEntry[],
): { category: GhCommandCategory; label: string; rows: GhCatalogEntry[] }[] {
  const order: GhCommandCategory[] = [
    'auth',
    'pr',
    'issue',
    'repo',
    'run',
    'workflow',
    'release',
    'api',
    'codespace',
    'general',
  ];
  const byCat = new Map<GhCommandCategory, GhCatalogEntry[]>();
  for (const r of rows) {
    const list = byCat.get(r.category) || [];
    list.push(r);
    byCat.set(r.category, list);
  }
  return order
    .filter((c) => byCat.has(c))
    .map((c) => ({
      category: c,
      label: GH_CATEGORY_LABELS[c],
      rows: (byCat.get(c) || []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    }));
}

/** Normalize D1 / API rows onto gh catalog shape. */
export function normalizeGhCommandRow(raw: Record<string, unknown>): GhCatalogEntry | null {
  const mapped = String(raw.mapped_command || raw.shell_line || raw.command_template || '').trim();
  if (!mapped) return null;
  if (!/^gh(\s|$)/i.test(mapped) && !String(raw.slug || '').startsWith('/gh/')) return null;
  const category = String(raw.category || 'general').toLowerCase() as GhCommandCategory;
  const validCategories = Object.keys(GH_CATEGORY_LABELS) as GhCommandCategory[];
  return {
    id: String(raw.id || raw.slug || mapped),
    slug: String(raw.slug || ''),
    display_name: String(raw.display_name || raw.name || mapped),
    category: validCategories.includes(category) ? category : 'general',
    mapped_command: mapped,
    description: raw.description != null ? String(raw.description) : undefined,
    risk_level: (raw.risk_level as GhCatalogEntry['risk_level']) || riskFor(mapped),
    requires_confirmation: Boolean(raw.requires_confirmation),
    sort_order: typeof raw.sort_order === 'number' ? raw.sort_order : 50,
  };
}

export function isGhCatalogEntry(row: { mapped_command?: string; slug?: string }): boolean {
  const cmd = String(row.mapped_command || '').trim();
  const slug = String(row.slug || '').trim();
  return /^gh(\s|$)/i.test(cmd) || slug.startsWith('/gh/');
}
