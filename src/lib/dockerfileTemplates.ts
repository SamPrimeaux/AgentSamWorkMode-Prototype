/**
 * Dockerfile / .dockerignore / docker-compose.yml generators, keyed by app shape.
 * Assume nothing exists on disk — these produce complete, ready-to-write file sets
 * for fully offline local prototyping (no metered hosting, no CF resources touched
 * unless the app code itself calls out to them).
 */

export type DockerAppType = 'static' | 'vite_react' | 'node_service' | 'wrangler_dev';

export interface DockerTemplateOptions {
  /** Used as image/container/compose-service name — will be slugified. */
  appSlug: string;
  /** Host port to publish. Defaults per app type if omitted. */
  port?: number;
  /** vite_react / node_service only — overrides the default build command. */
  buildCommand?: string;
  /** node_service only — overrides the default start command. */
  startCommand?: string;
  /** wrangler_dev only — entry file, defaults to src/index.ts. */
  entryFile?: string;
}

export interface DockerFileSet {
  dockerfile: string;
  dockerignore: string;
  compose: string;
}

export const DOCKER_APP_TYPE_LABELS: Record<DockerAppType, { label: string; sublabel: string }> = {
  static: { label: 'Static site', sublabel: 'HTML export → nginx' },
  vite_react: { label: 'Vite / React app', sublabel: 'npm build → nginx (multi-stage)' },
  node_service: { label: 'Node service', sublabel: 'Express/Fastify/etc, npm start' },
  wrangler_dev: { label: 'Cloudflare Worker (offline)', sublabel: 'wrangler dev --local, no CF resources hit' },
};

const DEFAULT_PORTS: Record<DockerAppType, number> = {
  static: 8080,
  vite_react: 4173,
  node_service: 3000,
  wrangler_dev: 8787,
};

export function slugifyForDocker(input: string): string {
  return (
    input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'app'
  );
}

const COMMON_DOCKERIGNORE = `node_modules
.git
.env
.env.*
dist
build
*.log
.DS_Store
`;

function generateStaticDockerfile(opts: DockerTemplateOptions): DockerFileSet {
  const slug = slugifyForDocker(opts.appSlug);
  const port = opts.port ?? DEFAULT_PORTS.static;
  const dockerfile = `# Static site — serves a prebuilt export (e.g. from Work Mode's Export Artifacts tab)
FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
# nginx listens on :80 internally — remap externally via -p ${port}:80
`;
  const compose = `services:
  ${slug}:
    build: .
    ports:
      - "${port}:80"
    restart: "no"
`;
  return { dockerfile, dockerignore: COMMON_DOCKERIGNORE, compose };
}

function generateViteReactDockerfile(opts: DockerTemplateOptions): DockerFileSet {
  const slug = slugifyForDocker(opts.appSlug);
  const port = opts.port ?? DEFAULT_PORTS.vite_react;
  const buildCmd = opts.buildCommand ?? 'npm run build';
  const dockerfile = `# Vite/React app — multi-stage: build, then serve static output via nginx
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN ${buildCmd}

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
# nginx listens on :80 internally — remap externally via -p ${port}:80
`;
  const compose = `services:
  ${slug}:
    build: .
    ports:
      - "${port}:80"
    restart: "no"
`;
  return { dockerfile, dockerignore: COMMON_DOCKERIGNORE, compose };
}

function generateNodeServiceDockerfile(opts: DockerTemplateOptions): DockerFileSet {
  const slug = slugifyForDocker(opts.appSlug);
  const port = opts.port ?? DEFAULT_PORTS.node_service;
  const startCmd = opts.startCommand ?? 'npm start';
  const dockerfile = `# Generic Node service — Express/Fastify/etc.
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
ENV PORT=${port}
EXPOSE ${port}
CMD ["sh", "-c", "${startCmd}"]
`;
  const compose = `services:
  ${slug}:
    build: .
    ports:
      - "${port}:${port}"
    environment:
      - PORT=${port}
    restart: "no"
`;
  return { dockerfile, dockerignore: COMMON_DOCKERIGNORE, compose };
}

function generateWranglerDevDockerfile(opts: DockerTemplateOptions): DockerFileSet {
  const slug = slugifyForDocker(opts.appSlug);
  const port = opts.port ?? DEFAULT_PORTS.wrangler_dev;
  const entry = opts.entryFile ?? 'src/index.ts';
  const dockerfile = `# Cloudflare Worker — runs wrangler dev inside the container for fully offline prototyping.
# --local means no live CF resources (D1/R2/KV/etc.) are touched — pure local sandbox.
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE ${port}
CMD ["npx", "wrangler", "dev", "${entry}", "--ip", "0.0.0.0", "--port", "${port}", "--local"]
`;
  const compose = `services:
  ${slug}:
    build: .
    ports:
      - "${port}:${port}"
    restart: "no"
    # --local keeps this fully offline — no wrangler.jsonc bindings hit real CF resources
`;
  return { dockerfile, dockerignore: COMMON_DOCKERIGNORE + '.wrangler\n', compose };
}

export function generateDockerFileSet(appType: DockerAppType, opts: DockerTemplateOptions): DockerFileSet {
  switch (appType) {
    case 'static':
      return generateStaticDockerfile(opts);
    case 'vite_react':
      return generateViteReactDockerfile(opts);
    case 'node_service':
      return generateNodeServiceDockerfile(opts);
    case 'wrangler_dev':
      return generateWranglerDevDockerfile(opts);
  }
}
