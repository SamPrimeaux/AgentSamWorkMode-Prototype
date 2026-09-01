export type DeployPaletteRow = {
  id: string;
  title: string;
  subtitle: string;
  commandText: string;
};

export const DEPLOY_PALETTE_ROWS: DeployPaletteRow[] = [
  {
    id: 'deploy-wrangler',
    title: 'Deploy Worker (wrangler)',
    subtitle: 'wrangler deploy',
    commandText: 'wrangler deploy',
  },
  {
    id: 'deploy-wrangler-dev',
    title: 'Wrangler dev server',
    subtitle: 'wrangler dev',
    commandText: 'wrangler dev',
  },
  {
    id: 'deploy-gh-pr-create',
    title: 'Create PR (gh)',
    subtitle: 'gh pr create --fill',
    commandText: 'gh pr create --fill',
  },
  {
    id: 'deploy-gh-auth-status',
    title: 'GitHub CLI auth status',
    subtitle: 'gh auth status',
    commandText: 'gh auth status',
  },
];

export function filterDeployPaletteRows(searchTerm: string, limit = 12): DeployPaletteRow[] {
  const t = searchTerm.trim().toLowerCase();
  const rows = !t
    ? DEPLOY_PALETTE_ROWS
    : DEPLOY_PALETTE_ROWS.filter((r) => {
        const hay = `${r.title} ${r.subtitle} ${r.commandText}`.toLowerCase();
        return hay.includes(t);
      });
  return rows.slice(0, limit);
}
