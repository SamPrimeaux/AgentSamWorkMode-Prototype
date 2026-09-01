import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/apiClient';
import type { ClientWebsiteData, SiteBlock } from '../types';
import { createEmptyWebsite } from '../lib/emptyState';

type CmsBootstrapPayload = {
  project_slug?: string;
  pages?: Array<{ id: string; slug: string; title?: string; status?: string }>;
  sections?: Array<{ id: string; type: string; name?: string; content?: Record<string, unknown> }>;
  theme?: Record<string, unknown>;
  error?: string;
};

function sectionsToBlocks(sections: CmsBootstrapPayload['sections']): SiteBlock[] {
  if (!sections?.length) return [];
  return sections.map((s, i) => {
    const content = (s.content || {}) as Record<string, string>;
    return {
      id: s.id || `block-${i}`,
      type: (s.type as SiteBlock['type']) || 'hero',
      name: s.name || s.type || 'Section',
      enabled: true,
      headline: content.headline,
      subheadline: content.subheadline,
      primaryCtaText: content.primaryCtaText,
    };
  });
}

/**
 * Loads website CMS state from /api/cms/bootstrap and /api/cms/pages.
 */
export function useCmsBridge(projectSlug?: string) {
  const [website, setWebsite] = useState<ClientWebsiteData>(() => createEmptyWebsite());
  const [loading, setLoading] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [projectId, setProjectId] = useState(projectSlug || '');

  const refresh = useCallback(async () => {
    const slug = (projectSlug || projectId).trim();
    if (!slug) return;

    setLoading(true);
    try {
      const bootstrapRes = await apiFetch<CmsBootstrapPayload>(
        `/api/cms/bootstrap?project_slug=${encodeURIComponent(slug)}`,
      );
      if (!bootstrapRes.ok) {
        if (bootstrapRes.error.status === 401) setAuthRequired(true);
        return;
      }
      setAuthRequired(false);
      const boot = bootstrapRes.data;
      const blocks = sectionsToBlocks(boot.sections);
      const hero = blocks.find((b) => b.type === 'hero');

      setWebsite((prev) => ({
        ...prev,
        id: slug,
        title: slug,
        clientName: slug,
        blocks: blocks.length ? blocks : prev.blocks,
        heroHeadline: hero?.headline || prev.heroHeadline,
        heroSubheadline: hero?.subheadline || prev.heroSubheadline,
      }));

      const pagesRes = await apiFetch<{ pages?: Array<{ id: string; slug: string; title?: string }> }>(
        `/api/cms/pages?project_id=${encodeURIComponent(slug)}`,
      );
      if (pagesRes.ok && pagesRes.data.pages?.length) {
        setWebsite((prev) => ({
          ...prev,
          navLinks: pagesRes.data.pages!.map((p) => ({
            id: p.id,
            label: p.title || p.slug,
            href: `/${p.slug}`,
          })),
        }));
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, projectSlug]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    website,
    setWebsite,
    loading,
    authRequired,
    projectId,
    setProjectId,
    refreshCms: refresh,
  };
}
