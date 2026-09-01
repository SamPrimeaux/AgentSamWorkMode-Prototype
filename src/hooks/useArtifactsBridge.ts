import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/apiClient';
import type { PresentationDeck, BrandKitData, GeneratedImageItem, GeneratedVideoItem, SlideItem } from '../types';
import { createEmptyBrandKit, createEmptyPresentation } from '../lib/emptyState';

export type ArtifactRow = {
  id: string;
  name?: string;
  description?: string;
  artifact_type?: string;
  r2_key?: string;
  public_url?: string;
  tags?: string;
  file_size_bytes?: number;
  created_at?: string;
};

function parseTags(raw?: string): string[] {
  if (!raw) return [];
  try {
    const j = JSON.parse(raw);
    return Array.isArray(j) ? j.map(String) : [];
  } catch {
    return raw.split(',').map((t) => t.trim()).filter(Boolean);
  }
}

function artifactToSlide(row: ArtifactRow, index: number): SlideItem {
  return {
    id: row.id,
    badge: row.artifact_type || 'artifact',
    title: row.name || `Slide ${index + 1}`,
    subtitle: row.description || '',
    bullets: parseTags(row.tags),
    metrics: [],
    accentColor: '#2563eb',
  };
}

function artifactToImage(row: ArtifactRow): GeneratedImageItem {
  return {
    id: row.id,
    prompt: row.description || row.name || '',
    imageUrl: row.public_url || `/api/artifacts/${row.id}/content`,
    model: 'artifact-store',
    aspectRatio: '16:9',
    timestamp: row.created_at || '',
    tags: parseTags(row.tags),
  };
}

/**
 * Loads presentations (decks) and brand media from GET /api/artifacts.
 */
export function useArtifactsBridge(projectKey?: string) {
  const [deck, setDeck] = useState<PresentationDeck>(() => createEmptyPresentation());
  const [brandKit, setBrandKit] = useState<BrandKitData>(() => createEmptyBrandKit());
  const [loading, setLoading] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [artifacts, setArtifacts] = useState<ArtifactRow[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ artifacts?: ArtifactRow[] }>('/api/artifacts');
      if (!res.ok) {
        if (res.error.status === 401) setAuthRequired(true);
        return;
      }
      setAuthRequired(false);
      const rows = res.data.artifacts || [];
      setArtifacts(rows);

      const presentationTypes = new Set(['presentation', 'deck', 'slide', 'markdown', 'html']);
      const imageTypes = new Set(['image', 'png', 'jpg', 'svg', 'brand']);
      const videoTypes = new Set(['video', 'mp4', 'webm']);

      const slides = rows
        .filter((r) => presentationTypes.has(String(r.artifact_type || '').toLowerCase()))
        .map(artifactToSlide);

      const images: GeneratedImageItem[] = rows
        .filter((r) => imageTypes.has(String(r.artifact_type || '').toLowerCase()))
        .map(artifactToImage);

      const videos: GeneratedVideoItem[] = rows
        .filter((r) => videoTypes.has(String(r.artifact_type || '').toLowerCase()))
        .map((r) => ({
          id: r.id,
          prompt: r.description || r.name || '',
          posterUrl: r.public_url || '',
          videoUrl: `/api/artifacts/${r.id}/content`,
          aspectRatio: '16:9' as const,
          duration: '',
          status: 'ready' as const,
          model: 'artifact-store',
          timestamp: r.created_at || '',
        }));

      if (slides.length) {
        setDeck((prev) => ({
          ...prev,
          slides,
          title: projectKey ? `${projectKey} deck` : prev.title,
          lastUpdated: new Date().toISOString(),
        }));
      }

      if (images.length || videos.length) {
        setBrandKit((prev) => ({
          ...prev,
          generatedImages: images.length ? images : prev.generatedImages,
          generatedVideos: videos.length ? videos : prev.generatedVideos,
        }));
      }
    } finally {
      setLoading(false);
    }
  }, [projectKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    deck,
    setDeck,
    brandKit,
    setBrandKit,
    artifacts,
    loading,
    authRequired,
    refreshArtifacts: refresh,
  };
}
