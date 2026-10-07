'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, apiList, query } from '@/lib/cms/api';
import type { Media } from '@/lib/cms/types';

const PER_PAGE = 30;

/** Uploads one file to the media library. */
export function uploadMedia(file: File, fields: Record<string, string> = {}): Promise<Media> {
  const form = new FormData();
  form.append('file', file);
  for (const [k, v] of Object.entries(fields)) if (v) form.append(k, v);
  return api<Media>('/api/v1/admin/media', { method: 'POST', body: form });
}

const cache = new Map<string, Media>();

/** Fetches one media item, remembering it for the rest of the session. */
export async function getMedia(id: string): Promise<Media> {
  const hit = cache.get(id);
  if (hit) return hit;
  const m = await api<Media>(`/api/v1/admin/media/${id}`);
  cache.set(id, m);
  return m;
}

export function rememberMedia(m: Media) {
  cache.set(m.id, m);
}

interface ListState {
  key: string;
  items: Media[];
  total: number;
  page: number;
  error: string | null;
}

/** A paged, filterable view of the media library. */
export function useMediaList(kind: string, search: string) {
  const key = `${kind}|${search}`;
  const [reloads, setReloads] = useState(0);
  const [state, setState] = useState<ListState>({ key: '', items: [], total: 0, page: 0, error: null });
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiList<Media>(`/api/v1/admin/media${query({ kind, search, page: 1, per_page: PER_PAGE })}`)
      .then(({ data, meta }) => {
        data.forEach(rememberMedia);
        if (!cancelled) setState({ key, items: data, total: meta.total, page: 1, error: null });
      })
      .catch((err: Error) => !cancelled && setState({ key, items: [], total: 0, page: 0, error: err.message }));
    return () => {
      cancelled = true;
    };
  }, [key, kind, search, reloads]);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const { data, meta } = await apiList<Media>(
        `/api/v1/admin/media${query({ kind, search, page: state.page + 1, per_page: PER_PAGE })}`,
      );
      data.forEach(rememberMedia);
      setState((s) => ({ ...s, items: [...s.items, ...data.filter((d) => !s.items.some((x) => x.id === d.id))], total: meta.total, page: s.page + 1 }));
    } finally {
      setLoadingMore(false);
    }
  }, [kind, search, state.page]);

  return {
    items: state.items,
    total: state.total,
    error: state.error,
    loading: state.key !== key,
    loadingMore,
    hasMore: state.items.length < state.total,
    loadMore,
    reload: () => setReloads((n) => n + 1),
    add: (m: Media) => setState((s) => ({ ...s, items: [m, ...s.items], total: s.total + 1 })),
    replace: (m: Media) => setState((s) => ({ ...s, items: s.items.map((x) => (x.id === m.id ? m : x)) })),
    remove: (id: string) => setState((s) => ({ ...s, items: s.items.filter((x) => x.id !== id), total: s.total - 1 })),
  };
}
