'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/cms/api';
import type { SeoMeta, SeoReport, SeoResult } from '@/lib/cms/types';
import { MediaField } from './MediaPicker';

interface Props {
  seo: SeoMeta;
  onChange: (seo: SeoMeta) => void;
  errors: Record<string, string>;
  /** The entry's other content, analyzed together with the SEO fields. */
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  hasFeaturedImage: boolean;
  /** Public URL of the entry, for the search preview. */
  url: string;
}

const TITLE_MAX = 60;
const DESC_MIN = 120;
const DESC_MAX = 156;

/** Yoast-style SEO box: fields, a Google preview and live analysis from the CMS. */
export function SeoPanel(p: Props) {
  const report = useAnalysis(p);
  const set = <K extends keyof SeoMeta>(k: K, v: SeoMeta[K]) => p.onChange({ ...p.seo, [k]: v });
  const err = (k: string) => p.errors[`seo.${k}`];

  const shownTitle = p.seo.meta_title || p.title || 'Page title';
  const shownDesc = p.seo.meta_description || p.excerpt || 'Add a meta description to control the text shown in search results.';

  return (
    <section className="cms-card cms-seo" aria-labelledby="seo-h">
      <div className="cms-seo__head">
        <h2 className="cms-h2" id="seo-h">SEO</h2>
        {report.data && (
          <div className="cms-row">
            <Score label="SEO" score={report.data.seo_score} rating={report.data.seo_rating} />
            <Score label="Readability" score={report.data.readability_score} rating={report.data.readability_rating} />
          </div>
        )}
      </div>

      <div className="cms-snippet" aria-label="Google search preview">
        <p className="cms-snippet__url">{p.url}</p>
        <p className="cms-snippet__title">{truncate(shownTitle, TITLE_MAX)}</p>
        <p className="cms-snippet__desc">{truncate(shownDesc, DESC_MAX)}</p>
      </div>

      <label className="cms-label">
        Focus keyword <span className="cms-muted">— the search phrase this page should rank for, e.g. &quot;hotel near Ramechhap airport&quot;</span>
        <input className="cms-input" value={p.seo.focus_keyword} onChange={(e) => set('focus_keyword', e.target.value)} />
        {err('focus_keyword') && <span className="cms-error">{err('focus_keyword')}</span>}
      </label>
      <label className="cms-label">
        SEO title
        <input className="cms-input" value={p.seo.meta_title} placeholder={p.title} onChange={(e) => set('meta_title', e.target.value)} />
        <Meter length={(p.seo.meta_title || p.title).length} min={30} max={TITLE_MAX} />
        {err('meta_title') && <span className="cms-error">{err('meta_title')}</span>}
      </label>
      <label className="cms-label">
        Meta description
        <textarea className="cms-input" rows={3} value={p.seo.meta_description} onChange={(e) => set('meta_description', e.target.value)} />
        <Meter length={p.seo.meta_description.length} min={DESC_MIN} max={DESC_MAX} />
        {err('meta_description') && <span className="cms-error">{err('meta_description')}</span>}
      </label>

      <details className="cms-advanced">
        <summary>Social sharing &amp; advanced</summary>
        <label className="cms-label">
          Social title (Facebook, WhatsApp…)
          <input className="cms-input" value={p.seo.og_title} placeholder={shownTitle} onChange={(e) => set('og_title', e.target.value)} />
        </label>
        <label className="cms-label">
          Social description
          <textarea className="cms-input" rows={2} value={p.seo.og_description} placeholder={p.seo.meta_description} onChange={(e) => set('og_description', e.target.value)} />
        </label>
        <div className="cms-label">
          Social image <span className="cms-muted">— uses the featured image when empty</span>
          <MediaField value={p.seo.og_image_id} onChange={(id) => p.onChange({ ...p.seo, og_image_id: id, og_image_url: id ? '' : p.seo.og_image_url })} />
          {err('og_image_id') && <span className="cms-error">{err('og_image_id')}</span>}
        </div>
        <label className="cms-label">
          Canonical URL <span className="cms-muted">— only if this content first appeared elsewhere</span>
          <input className="cms-input" type="url" value={p.seo.canonical_url} placeholder={p.url} onChange={(e) => set('canonical_url', e.target.value)} />
          {err('canonical_url') && <span className="cms-error">{err('canonical_url')}</span>}
        </label>
        <label className="cms-check">
          <input type="checkbox" checked={p.seo.no_index} onChange={(e) => set('no_index', e.target.checked)} />
          Hide from search engines (noindex)
        </label>
        <label className="cms-check">
          <input type="checkbox" checked={p.seo.no_follow} onChange={(e) => set('no_follow', e.target.checked)} />
          Ask search engines not to follow links (nofollow)
        </label>
      </details>

      <div className="cms-analysis" aria-live="polite">
        {report.error ? (
          <p className="cms-muted">{report.error}</p>
        ) : !report.data ? (
          <p className="cms-muted">Analyzing…</p>
        ) : (
          <>
            <Results title="SEO analysis" results={report.data.results.filter((r) => r.category === 'seo')} />
            <Results title="Readability" results={report.data.results.filter((r) => r.category === 'readability')} />
          </>
        )}
      </div>
    </section>
  );
}

/** Re-runs the CMS analysis shortly after the user stops typing. */
function useAnalysis(p: Props) {
  const body = JSON.stringify({
    title: p.title,
    slug: p.slug,
    content: p.content,
    excerpt: p.excerpt,
    has_featured_image: p.hasFeaturedImage,
    seo: p.seo,
  });
  const [state, setState] = useState<{ body: string; data: SeoReport | null; error: string | null }>({ body: '', data: null, error: null });
  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      api<SeoReport>('/api/v1/admin/seo/analyze', { method: 'POST', body: JSON.parse(body), signal: ctrl.signal })
        .then((data) => setState({ body, data, error: null }))
        .catch((err) => {
          if (ctrl.signal.aborted) return;
          const msg = err instanceof ApiError && err.status === 422 ? 'Fix the SEO fields marked in red to see the analysis.' : 'Analysis unavailable right now.';
          setState((s) => ({ body, data: s.data, error: msg }));
        });
    }, 700);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [body]);
  return state;
}

function Score({ label, score, rating }: { label: string; score: number; rating: string }) {
  if (rating === 'na') return null;
  return (
    <span className={`cms-score cms-score--${rating}`} title={`${label} score: ${score}/100`}>
      <span className="cms-dot" aria-hidden="true" />
      {label} {score}
    </span>
  );
}

function Results({ title, results }: { title: string; results: SeoResult[] }) {
  if (results.length === 0) return null;
  const order = { problem: 0, ok: 1, good: 2 };
  const sorted = [...results].sort((a, b) => order[a.status] - order[b.status]);
  return (
    <div className="cms-results">
      <h3 className="cms-h3">{title}</h3>
      <ul>
        {sorted.map((r) => (
          <li key={r.id} className={`cms-result cms-result--${r.status}`}>
            <span className="cms-dot" aria-label={r.status} />
            {r.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Meter({ length, min, max }: { length: number; min: number; max: number }) {
  const state = length === 0 ? 'bad' : length < min ? 'ok' : length <= max ? 'good' : 'ok';
  return (
    <span className={`cms-meter cms-meter--${state}`}>
      <span style={{ width: `${Math.min(100, (length / max) * 100)}%` }} />
      <small>{length} / {max} characters</small>
    </span>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
}
