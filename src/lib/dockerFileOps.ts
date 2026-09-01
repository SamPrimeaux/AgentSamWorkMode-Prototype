import { DockerAppType, DockerFileSet, DockerTemplateOptions, generateDockerFileSet, slugifyForDocker } from './dockerfileTemplates';

/** Heredoc delimiter for writing generated file content through the shell exec bridge.
 *  Quoted ('EOF') so the shell does NOT interpolate $vars or `backticks` in file content. */
const HEREDOC_MARKER = 'AGENTSAM_DOCKERFILE_EOF';

/** Turns file content into a `cat > path << 'MARKER' ... MARKER` command safe to send
 *  through useTerminalBridge().execCommand() (there is no separate file-write bridge yet
 *  in this app — everything routes through the same shell exec path as wrangler/gh commands). */
export function heredocWriteCommand(path: string, content: string): string {
  const body = content.endsWith('\n') ? content : `${content}\n`;
  return `cat > ${path} << '${HEREDOC_MARKER}'\n${body}${HEREDOC_MARKER}`;
}

export interface DockerDeployPlan {
  /** One heredoc write per generated file — run these first, in order. */
  writeCommands: { path: string; command: string }[];
  buildCommand: string;
  /** Ephemeral by default: --rm, capped memory/cpu. */
  runCommand: string;
  hostPort: number;
  files: DockerFileSet;
}

/** "Assume nothing exists" plan: write Dockerfile + .dockerignore + compose, build, then run --rm. */
export function buildDockerDeployPlan(appType: DockerAppType, opts: DockerTemplateOptions): DockerDeployPlan {
  const files = generateDockerFileSet(appType, opts);
  const slug = slugifyForDocker(opts.appSlug);
  const defaultPortByType: Record<DockerAppType, number> = {
    static: 8080,
    vite_react: 4173,
    node_service: 3000,
    wrangler_dev: 8787,
  };
  const hostPort = opts.port ?? defaultPortByType[appType];
  const containerPort = appType === 'static' || appType === 'vite_react' ? 80 : hostPort;

  const writeCommands = [
    { path: 'Dockerfile', command: heredocWriteCommand('Dockerfile', files.dockerfile) },
    { path: '.dockerignore', command: heredocWriteCommand('.dockerignore', files.dockerignore) },
    { path: 'docker-compose.yml', command: heredocWriteCommand('docker-compose.yml', files.compose) },
  ];

  const buildCommand = `docker build -t ${slug}:local .`;
  const runCommand = `docker run --rm --memory=512m --cpus=1 -p ${hostPort}:${containerPort} --name ${slug} ${slug}:local`;

  return { writeCommands, buildCommand, runCommand, hostPort, files };
}
