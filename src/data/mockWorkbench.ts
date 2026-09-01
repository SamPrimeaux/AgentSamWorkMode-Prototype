import { AppConfig, WorkbenchPullRequest, WorkbenchWorkspace, PwaCacheStatus, ExecOsLocalLaneStatus } from '../types';
import {
  createDisconnectedExecOsStatus,
  createDisconnectedPwaStatus,
  createEmptyWorkbenchPR,
  createEmptyWorkbenchWorkspaces,
} from '../lib/emptyState';

export function getDynamicWorkbenchPR1(): WorkbenchPullRequest | null {
  return createEmptyWorkbenchPR();
}

export function getDynamicWorkspaces(): WorkbenchWorkspace[] {
  return createEmptyWorkbenchWorkspaces();
}

export function getDynamicPwaCacheStatus(): PwaCacheStatus {
  return createDisconnectedPwaStatus();
}

export function getDynamicExecOsStatus(customConfig?: Partial<AppConfig>): ExecOsLocalLaneStatus {
  return createDisconnectedExecOsStatus(customConfig);
}

export const INITIAL_WORKBENCH_PR1 = createEmptyWorkbenchPR();
export const INITIAL_WORKBENCH_WORKSPACES = createEmptyWorkbenchWorkspaces();
export const INITIAL_PWA_CACHE_STATUS = createDisconnectedPwaStatus();
export const INITIAL_EXECOS_STATUS = createDisconnectedExecOsStatus();
