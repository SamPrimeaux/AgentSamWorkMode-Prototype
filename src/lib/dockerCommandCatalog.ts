/**
 * Docker command catalog for Cmd+K / runtime target actions.
 * Mirrors wranglerCommandCatalog.ts — same shape, same risk model, same exec path
 * (commands are sent as plain strings through useTerminalBridge().execCommand()
 * on whichever ExecutionLane is currently active — local_exc or gcp_vm).
 *
 * Design intent: Docker is NOT a new ExecutionLane. It's just another catalog of
 * shell commands that runs through the lane you already have selected. This keeps
 * Docker on infra you already pay for (local Mac / GCP VM) instead of introducing
 * a metered container-hosting bill.
 *
 * `run` defaults to --rm (ephemeral, destroy-on-completion) with explicit resource
 * caps — no idle containers, no unbounded concurrency, no surprise charges.
 */

export type DockerCommandCategory = 'build' | 'run' | 'compose' | 'inspect' | 'cleanup';

export type DockerCatalogEntry = {
  id: string;
  slug: string;
  display_name: string;
  category: DockerCommandCategory;
  mapped_command: string;
  description?: string;
  risk_level: 'low' | 'medium' | 'high';
  requires_confirmation?: boolean;
  sort_order: number;
};

const destructive = /\b(rm|rmi|prune|kill|down)\b/i;
const write = /\b(build|run|up|tag|push)\b/i;

function riskFor(cmd: string): 'low' | 'medium' | 'high' {
  if (destructive.test(cmd)) return 'high';
  if (write.test(cmd)) return 'medium';
  return 'low';
}

function entry(
  category: DockerCommandCategory,
  slug: string,
  display_name: string,
  mapped_command: string,
  sort_order: number,
  description?: string,
): DockerCatalogEntry {
  const risk_level = riskFor(mapped_command);
  return {
    id: `cmd_docker_${slug.replace(/\//g, '_')}`,
    slug: `/docker/${slug}`,
    display_name,
    category,
    mapped_command,
    description,
    risk_level,
    requires_confirmation: risk_level !== 'low',
    sort_order,
  };
}

export const DOCKER_CATEGORY_LABELS: Record<DockerCommandCategory, string> = {
  build: 'Build',
  run: 'Run (ephemeral)',
  compose: 'Compose',
  inspect: 'Inspect',
  cleanup: 'Cleanup',
};

export const DOCKER_COMMAND_CATALOG: DockerCatalogEntry[] = [
  entry('build', 'build-tagged', 'Build image (tagged)', 'docker build -t <APP_SLUG>:local .', 1, 'Build the current app/artifact into a local image.'),
  entry('build', 'build-no-cache', 'Build image (no cache)', 'docker build --no-cache -t <APP_SLUG>:local .', 2),

  entry(
    'run',
    'run-ephemeral',
    'Run (ephemeral, capped)',
    'docker run --rm --memory=512m --cpus=1 -p <HOST_PORT>:<CONTAINER_PORT> <APP_SLUG>:local',
    10,
    'Destroys itself on completion. No network unless the app needs it — add --network=none for untrusted code.',
  ),
  entry(
    'run',
    'run-ephemeral-timeout',
    'Run (ephemeral, hard timeout)',
    'timeout 30s docker run --rm --memory=512m --cpus=1 <APP_SLUG>:local',
    11,
    'Hard-kills after 30s regardless of process state — use for agent-triggered/untrusted execution.',
  ),
  entry('run', 'run-detached', 'Run (detached, named)', 'docker run -d --name <APP_SLUG> --memory=512m --cpus=1 -p <HOST_PORT>:<CONTAINER_PORT> <APP_SLUG>:local', 12, 'Persistent — remember to stop/rm explicitly, this is NOT ephemeral.'),

  entry('compose', 'compose-up', 'Compose up (detached)', 'docker compose up -d', 20),
  entry('compose', 'compose-up-build', 'Compose up (rebuild)', 'docker compose up -d --build', 21),
  entry('compose', 'compose-down', 'Compose down', 'docker compose down', 22, 'Stops and removes containers/networks defined in compose file.'),
  entry('compose', 'compose-down-volumes', 'Compose down (+ volumes)', 'docker compose down -v', 23, 'Also destroys named volumes — data loss if not backed up.'),

  entry('inspect', 'ps', 'List running containers', 'docker ps', 30),
  entry('inspect', 'ps-all', 'List all containers', 'docker ps -a', 31),
  entry('inspect', 'logs', 'Tail logs', 'docker logs -f --tail=100 <CONTAINER>', 32),
  entry('inspect', 'stats', 'Live resource stats', 'docker stats --no-stream', 33, 'One-shot snapshot of CPU/mem per container — catches leaked/idle containers.'),
  entry('inspect', 'images', 'List images', 'docker images', 34),

  entry('cleanup', 'stop', 'Stop container', 'docker stop <CONTAINER>', 40),
  entry('cleanup', 'rm', 'Remove container', 'docker rm <CONTAINER>', 41),
  entry('cleanup', 'rmi', 'Remove image', 'docker rmi <IMAGE>', 42),
  entry('cleanup', 'prune-containers', 'Prune stopped containers', 'docker container prune -f', 43, 'Cleans up leaked ephemeral containers that failed to self-destroy.'),
  entry('cleanup', 'prune-system', 'Prune system (all unused)', 'docker system prune -f', 44, 'Removes all unused containers, networks, images, and build cache.'),
];

export function filterDockerCatalog(term: string, limit = 40): DockerCatalogEntry[] {
  const t = term.trim().toLowerCase();
  const rows = !t
    ? DOCKER_COMMAND_CATALOG
    : DOCKER_COMMAND_CATALOG.filter((c) => {
        const hay = `${c.display_name} ${c.mapped_command} ${c.category} ${c.slug}`.toLowerCase();
        return hay.includes(t);
      });
  return rows.slice(0, limit);
}

export function groupDockerCatalog(
  rows: DockerCatalogEntry[],
): { category: DockerCommandCategory; label: string; rows: DockerCatalogEntry[] }[] {
  const order: DockerCommandCategory[] = ['build', 'run', 'compose', 'inspect', 'cleanup'];
  const byCat = new Map<DockerCommandCategory, DockerCatalogEntry[]>();
  for (const r of rows) {
    const list = byCat.get(r.category) || [];
    list.push(r);
    byCat.set(r.category, list);
  }
  return order
    .filter((c) => byCat.has(c))
    .map((c) => ({
      category: c,
      label: DOCKER_CATEGORY_LABELS[c],
      rows: (byCat.get(c) || []).sort((a, b) => a.sort_order - b.sort_order),
    }));
}
