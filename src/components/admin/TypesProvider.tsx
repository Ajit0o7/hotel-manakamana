'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, ApiError } from '@/lib/cms/api';
import type { ContentType } from '@/lib/cms/types';

interface TypesValue {
  types: ContentType[] | null;
  error: string | null;
}

const TypesContext = createContext<TypesValue>({ types: null, error: null });

/** The content types registered in the CMS (pages, posts, and any custom ones). */
export function useContentTypes(): TypesValue {
  return useContext(TypesContext);
}

export function useContentType(name: string): ContentType | undefined {
  return useContext(TypesContext).types?.find((t) => t.name === name);
}

export function TypesProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<TypesValue>({ types: null, error: null });
  useEffect(() => {
    let cancelled = false;
    api<ContentType[]>('/api/v1/admin/content-types')
      .then((types) => !cancelled && setValue({ types, error: null }))
      .catch((err) => !cancelled && setValue({ types: null, error: err instanceof ApiError ? err.message : 'Could not load content types.' }));
    return () => {
      cancelled = true;
    };
  }, []);
  return <TypesContext.Provider value={value}>{children}</TypesContext.Provider>;
}
