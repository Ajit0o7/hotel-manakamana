import { CMS_API_URL } from './config';
import { supabase } from './supabase';
import type { ListMeta } from './types';

/** An error response from the CMS API, or a failure to reach it (status 0). */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

/* The CMS runs on a free Render instance that sleeps when idle and takes up to a minute to wake.
   Requests that are still running after a few seconds are reported so the UI can say so. */
const SLOW_AFTER_MS = 4000;
let slowCount = 0;
const slowListeners = new Set<(slow: boolean) => void>();

export function onSlowRequests(listener: (slow: boolean) => void): () => void {
  slowListeners.add(listener);
  return () => slowListeners.delete(listener);
}

function setSlow(delta: number) {
  const before = slowCount > 0;
  slowCount += delta;
  if (before !== slowCount > 0) slowListeners.forEach((l) => l(slowCount > 0));
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
}

async function request(path: string, { method = 'GET', body, signal }: RequestOptions = {}) {
  const { data } = await supabase().auth.getSession();
  const headers: Record<string, string> = {};
  if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`;
  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let slow = false;
  const timer = setTimeout(() => {
    slow = true;
    setSlow(1);
  }, SLOW_AFTER_MS);
  let res: Response;
  try {
    res = await fetch(CMS_API_URL + path, { method, headers, body: payload, signal });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new ApiError('Could not reach the CMS server. Check your connection and try again.', 0, 'network');
  } finally {
    clearTimeout(timer);
    if (slow) setSlow(-1);
  }

  if (res.status === 204) return undefined;
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const e = json?.error ?? {};
    throw new ApiError(e.message || `Request failed (HTTP ${res.status})`, res.status, e.code || 'error', e.fields || {});
  }
  return json;
}

/** Calls an endpoint that returns {"data": ...} and returns the data. */
export async function api<T>(path: string, options?: RequestOptions): Promise<T> {
  const json = await request(path, options);
  return json?.data as T;
}

/** Calls a list endpoint and returns the items and paging info. */
export async function apiList<T>(path: string, options?: RequestOptions): Promise<{ data: T[]; meta: ListMeta }> {
  const json = await request(path, options);
  return { data: (json?.data ?? []) as T[], meta: json?.meta as ListMeta };
}

/** Builds a query string, leaving out empty values. */
export function query(params: Record<string, string | number | boolean | undefined | null>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}
