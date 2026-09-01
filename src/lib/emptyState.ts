import {
  AppConfig,
  BrandKitData,
  ChatMessageItem,
  ClientWebsiteData,
  CollaboratorAgent,
  DashboardMetric,
  ExecOsLocalLaneStatus,
  PresentationDeck,
  PwaCacheStatus,
  WorkbenchPullRequest,
  WorkbenchWorkspace,
} from '../types';
import { getEnvironmentConfig } from '../contexts/ConfigurationContext';

const idleDeployment = {
  status: 'idle' as const,
  subdomain: '',
  deployedUrl: '',
  lastDeployedAt: '',
  version: '',
  sslStatus: 'provisioning' as const,
  edgeRegion: '',
  commitHash: '',
};

export function createEmptyPresentation(config?: Partial<AppConfig>): PresentationDeck {
  const cfg = { ...getEnvironmentConfig(), ...config };
  return {
    id: 'deck-empty',
    title: 'Untitled presentation',
    client: cfg.clientBrandName || 'Workspace',
    version: 'v0',
    lastUpdated: '',
    slides: [],
  };
}

export function createEmptyWebsite(config?: Partial<AppConfig>): ClientWebsiteData {
  const cfg = { ...getEnvironmentConfig(), ...config };
  return {
    id: 'site-empty',
    title: 'Untitled site',
    clientName: cfg.clientBrandName || 'Workspace',
    tagline: cfg.clientTagline || '',
    heroHeadline: '',
    heroSubheadline: '',
    primaryCta: 'Get started',
    secondaryCta: 'Learn more',
    accentColor: '#2563eb',
    theme: {
      primaryColor: '#2563eb',
      accentColor: '#2563eb',
      backgroundTheme: 'light',
      fontFamily: 'sans',
      borderRadius: 'md',
      showGridLines: false,
    },
    blocks: [],
    features: [],
    pricingTiers: [],
    testimonials: [],
    faqs: [],
    stats: [],
    navLinks: [],
    seo: { metaTitle: '', metaDescription: '' },
    deployment: { ...idleDeployment, edgeRegion: cfg.edgeRegion || '' },
    snapshots: [],
  };
}

export function createEmptyMetrics(): DashboardMetric[] {
  return [];
}

export function createEmptyBrandKit(config?: Partial<AppConfig>): BrandKitData {
  const cfg = { ...getEnvironmentConfig(), ...config };
  return {
    brandName: cfg.clientBrandName || 'Workspace',
    tagline: cfg.clientTagline || '',
    mission: cfg.clientMission || '',
    primaryColor: '#18181b',
    secondaryColor: '#3f3f46',
    accentColor: '#2563eb',
    neutralDark: '#09090b',
    neutralLight: '#fafafa',
    fontHeading: 'Plus Jakarta Sans',
    fontBody: 'Plus Jakarta Sans',
    logoKeywords: [],
    generatedImages: [],
    generatedVideos: [],
  };
}

export function createEmptyCollaborators(): CollaboratorAgent[] {
  return [];
}

export function createEmptyMessages(): ChatMessageItem[] {
  return [];
}

export function createDisconnectedPwaStatus(): PwaCacheStatus {
  return {
    swRegistered: false,
    swStatus: 'redundant',
    cacheEngine: 'Unconditional Purge (Legacy)',
    startupPurgeDisabled: false,
    nonBlockingMount: false,
    shellCached: false,
    lazyMonacoWarmed: false,
    lazyXtermWarmed: false,
    lazyThreeWarmed: false,
    cacheSizeKb: 0,
  };
}

export function createDisconnectedExecOsStatus(config?: Partial<AppConfig>): ExecOsLocalLaneStatus {
  const cfg = { ...getEnvironmentConfig(), ...config };
  return {
    activeLane: 'local_mac',
    isConnected: false,
    latencyMs: 0,
    daemonPort: cfg.execOsPort,
    tunnelUrl: cfg.execOsTunnelUrl,
    workerUrl: cfg.execOsWorkerUrl,
    macUsername: cfg.macUsername,
    defaultCwd: cfg.defaultPath,
    uptime: '',
    pm2ProcessName: '',
    pm2Pid: 0,
    isEcosystemSanitized: false,
    cursorBleedDetected: false,
    totalInheritedEnvVars: 0,
    sanitizedEnvVars: [],
    bloatedEnvVarsSample: [],
    sshMode: 'sandboxed',
    sshAuthSockPath: '',
    fsPermissionsSecure: true,
    allowedTenants: [],
    mcpFsRoots: [],
    operatorRepoPaths: [],
    recentLocalCommands: [],
  };
}

export function createEmptyWorkbenchWorkspaces(): WorkbenchWorkspace[] {
  return [];
}

export function createEmptyWorkbenchPR(): WorkbenchPullRequest | null {
  return null;
}
