import React, { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import { AppConfig, ModelChoice } from '../types';

/**
 * Resolves deployment/config defaults from client-accessible environment variables.
 * These values are defaults only; browser storage is not an identity, repo, tenant,
 * connection, or execution authority.
 */
export function getEnvironmentConfig(): AppConfig {
  const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : ({} as any);

  const envMode: 'development' | 'production' | 'test' | 'preview' =
    env.MODE === 'test' ? 'test' :
    env.MODE === 'development' || env.DEV ? 'development' :
    'production';

  return {
    appTitle: env.VITE_APP_TITLE || 'Agent Sam Work Mode - Execution Agent',
    appName: env.VITE_APP_NAME || 'Agent Sam',
    agentName: env.VITE_AGENT_NAME || env.VITE_APP_NAME || 'Agent Sam',
    agentRole: env.VITE_AGENT_ROLE || 'Lead Execution & Full-Stack Orchestrator',
    agentInitials: env.VITE_AGENT_INITIALS || 'AS',
    developerName: env.VITE_USER_NAME || 'Developer',
    developerInitials: env.VITE_USER_INITIALS || 'DV',
    developerEmail: env.VITE_USER_EMAIL || '',
    organization: env.VITE_ORGANIZATION || '',
    activeTenant: env.VITE_TENANT_ID || '',
    defaultBranch: env.VITE_DEFAULT_BRANCH || 'main',
    defaultPath: env.VITE_DEFAULT_WORKSPACE_PATH || '',
    execOsPort: Number(env.VITE_EXECOS_PORT) || 3099,
    execOsTunnelUrl: env.VITE_EXECOS_TUNNEL_URL || '',
    execOsWorkerUrl: env.VITE_EXECOS_WORKER_URL || '',
    macUsername: env.VITE_EXECOS_MAC_USER || '',
    clientBrandName: env.VITE_CLIENT_BRAND_NAME || 'Workspace',
    clientTagline: env.VITE_CLIENT_TAGLINE || '',
    clientMission: env.VITE_CLIENT_MISSION || '',
    defaultModel: (env.VITE_DEFAULT_MODEL as ModelChoice) || 'gemini-3.5-flash',
    edgeRegion: env.VITE_EDGE_REGION || 'iad1 (US East)',
    apiBaseUrl: env.VITE_API_BASE_URL || '/api',
    environment: envMode,
  };
}

/**
 * Only harmless user/device preferences belong here. Runtime/context fields such as
 * tenant, branch, path, ExecOS URLs, developer identity, etc. stay in memory or come
 * from the authenticated/server runtime.
 */
const PREFERENCES_STORAGE_KEY = 'agentsam_user_preferences_v1';
const LEGACY_OVERRIDES_STORAGE_KEY = 'agentsam_dynamic_config_overrides';

type PersistedConfigPreferences = Pick<AppConfig, 'defaultModel'>;

function readPersistedPreferences(): Partial<PersistedConfigPreferences> {
  if (typeof window === 'undefined') return {};
  try {
    const current = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (current) return JSON.parse(current) as Partial<PersistedConfigPreferences>;

    // One-way migration: salvage only the preference field from the old whole-config blob.
    const legacy = localStorage.getItem(LEGACY_OVERRIDES_STORAGE_KEY);
    if (!legacy) return {};
    const parsed = JSON.parse(legacy) as Partial<AppConfig>;
    const migrated: Partial<PersistedConfigPreferences> = {};
    if (parsed.defaultModel) migrated.defaultModel = parsed.defaultModel;
    if (migrated.defaultModel) {
      localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(migrated));
    }
    localStorage.removeItem(LEGACY_OVERRIDES_STORAGE_KEY);
    return migrated;
  } catch (err) {
    console.warn('Failed to parse cached user preferences', err);
    return {};
  }
}

function persistPreferences(config: AppConfig): void {
  if (typeof window === 'undefined') return;
  try {
    const persisted: PersistedConfigPreferences = {
      defaultModel: config.defaultModel,
    };
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // Browser storage is an optimization only; config remains usable in memory.
  }
}

interface ConfigurationContextType {
  config: AppConfig;
  updateConfig: (updates: Partial<AppConfig>) => void;
  resetConfig: () => void;
  setActiveTenant: (tenant: string) => void;
  setActiveBranch: (branch: string) => void;
  setActivePath: (path: string) => void;
  updateDeveloperProfile: (name: string, email: string, initials?: string) => void;
}

const ConfigurationContext = createContext<ConfigurationContextType | null>(null);

export interface ConfigurationProviderProps {
  children: ReactNode;
  initialOverrides?: Partial<AppConfig>;
}

export const ConfigurationProvider: React.FC<ConfigurationProviderProps> = ({
  children,
  initialOverrides,
}) => {
  const [config, setConfig] = useState<AppConfig>(() => ({
    ...getEnvironmentConfig(),
    ...readPersistedPreferences(),
    ...initialOverrides,
  }));

  const updateConfig = (updates: Partial<AppConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...updates };
      persistPreferences(next);
      return next;
    });
  };

  const resetConfig = () => {
    const base = { ...getEnvironmentConfig(), ...initialOverrides };
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(PREFERENCES_STORAGE_KEY);
        localStorage.removeItem(LEGACY_OVERRIDES_STORAGE_KEY);
      }
    } catch {}
    setConfig(base);
  };

  /** Compatibility setters: these update current in-memory view/runtime context only. */
  const setActiveTenant = (activeTenant: string) => {
    setConfig((prev) => ({ ...prev, activeTenant }));
  };

  const setActiveBranch = (defaultBranch: string) => {
    setConfig((prev) => ({ ...prev, defaultBranch }));
  };

  const setActivePath = (defaultPath: string) => {
    setConfig((prev) => ({ ...prev, defaultPath }));
  };

  const updateDeveloperProfile = (name: string, email: string, initials?: string) => {
    const derivedInitials = initials || name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'DV';
    setConfig((prev) => ({
      ...prev,
      developerName: name,
      developerEmail: email,
      developerInitials: derivedInitials,
    }));
  };

  const contextValue = useMemo<ConfigurationContextType>(() => ({
    config,
    updateConfig,
    resetConfig,
    setActiveTenant,
    setActiveBranch,
    setActivePath,
    updateDeveloperProfile,
  }), [config]);

  return (
    <ConfigurationContext.Provider value={contextValue}>
      {children}
    </ConfigurationContext.Provider>
  );
};

export function useConfiguration(): ConfigurationContextType {
  const context = useContext(ConfigurationContext);
  if (!context) {
    const fallbackConfig = getEnvironmentConfig();
    return {
      config: fallbackConfig,
      updateConfig: () => {},
      resetConfig: () => {},
      setActiveTenant: () => {},
      setActiveBranch: () => {},
      setActivePath: () => {},
      updateDeveloperProfile: () => {},
    };
  }
  return context;
}

export function useAppConfig(): AppConfig {
  return useConfiguration().config;
}
