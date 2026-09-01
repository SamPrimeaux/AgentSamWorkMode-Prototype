import { ExecutionLane } from './types';

/**
 * Where an app/artifact/idea built in Work Mode ends up living.
 * Distinct from ExecutionLane (which controls where SHELL COMMANDS run) —
 * a RuntimeTarget is the deploy/output destination for the thing being built.
 * Docker targets execute their build/run commands on whatever ExecutionLane
 * is currently active (execLane below is the DEFAULT suggestion, not a hard lock).
 */
export type RuntimeTarget = 'cloudflare_workers' | 'docker_local' | 'static_export';

export interface RuntimeTargetOption {
  id: RuntimeTarget;
  label: string;
  sublabel: string;
  execLane?: ExecutionLane;
  status: 'available' | 'coming_soon';
}

export const RUNTIME_TARGET_OPTIONS: RuntimeTargetOption[] = [
  {
    id: 'cloudflare_workers',
    label: 'Cloudflare Workers',
    sublabel: 'wrangler deploy — edge, global',
    status: 'available',
  },
  {
    id: 'docker_local',
    label: 'Docker (local)',
    sublabel: 'Runs on your Mac or GCP VM — no metered hosting',
    execLane: 'local_exc',
    status: 'available',
  },
  {
    id: 'static_export',
    label: 'Static export',
    sublabel: 'Download .html/.json — host anywhere',
    status: 'available',
  },
];
