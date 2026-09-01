import { AppConfig, ChatMessageItem, PresentationDeck, ClientWebsiteData, DashboardMetric, BrandKitData, CollaboratorAgent } from '../types';
import {
  createEmptyBrandKit,
  createEmptyCollaborators,
  createEmptyMessages,
  createEmptyMetrics,
  createEmptyPresentation,
  createEmptyWebsite,
} from '../lib/emptyState';

/** @deprecated Use createEmpty* from lib/emptyState. Kept for import compatibility. */
export function getDynamicCollaborators(_customConfig?: Partial<AppConfig>): CollaboratorAgent[] {
  return createEmptyCollaborators();
}

export function getDynamicPresentation(customConfig?: Partial<AppConfig>): PresentationDeck {
  return createEmptyPresentation(customConfig);
}

export function getDynamicClientWebsite(customConfig?: Partial<AppConfig>): ClientWebsiteData {
  return createEmptyWebsite(customConfig);
}

export function getDynamicDashboardMetrics(): DashboardMetric[] {
  return createEmptyMetrics();
}

export function getDynamicBrandKit(customConfig?: Partial<AppConfig>): BrandKitData {
  return createEmptyBrandKit(customConfig);
}

export function getDynamicMessages(): ChatMessageItem[] {
  return createEmptyMessages();
}

export const INITIAL_COLLABORATORS = createEmptyCollaborators();
export const INITIAL_PRESENTATION = createEmptyPresentation();
export const INITIAL_CLIENT_WEBSITE = createEmptyWebsite();
export const INITIAL_DASHBOARD_METRICS = createEmptyMetrics();
export const INITIAL_BRAND_KIT = createEmptyBrandKit();
export const INITIAL_MESSAGES = createEmptyMessages();
