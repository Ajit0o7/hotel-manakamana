'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiList, query } from '@/lib/cms/api';
import { formatDate } from '@/lib/cms/format';
import type { Entry, ListMeta } from '@/lib/cms/types';
import { StatusBadge } from './EntryEditor';
import { Spinner } from './Spinner';
import { useContentType, useContentTypes } from './TypesProvider';

const TABS = [
  { value: '', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Drafts' },
  { value: 'archived', label: 'Archived' },
];
const PER_PAGE = 20;

export function EntryList({ type }: { type: string }) {
  const { types, error: typesError } = useContentTypes();
  const ct = useContentType(type);
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const key = `${type}|${status}|${search}|${page}`;
  const [result, setResult] = useState<{ key: string; items: Entry[]; meta: ListMeta | null; error: string | null }>({
    key: '',
    items: [],
    meta: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    apiList<Entry>(`/api/v1/admin/content/${type}${query({ status, search, page, per_page: PER_PAGE, order: 'updated' })}`)
      .then(({ data, meta }) => !cancelled && setResult({ key, items: data, meta, error: null }))
      .catch((err: Error) => !cancelled && setResult({ key, items: [], meta: null, error: err.message }));
    return () => {
      cancelled = true;
    };
  }, [key, type, status, search, page]);

  if (typesError) return <p className="cms-error">{typesError}</p>;
  if (types && !ct) return <p className="cms-error">Unknown content type &quot;{type}&quot;.</p>;
  if (!ct) return <Spinner />;

  const loading = result.key !== key;
  const pages = result.meta ? Math.max(1, Math.ceil(result.meta.total / PER_PAGE)) : 1;

  return (
    <div className="cms-page">
      <header className="cms-page__head">
        <h1 className="cms-h1">{ct.label_plural}</h1>
        <Link className="cms-btn cms-btn--primary" href={`/admin/content/${type}/new`}>Add {ct.label.toLowerCase()}</Link>
      </header>
      {ct.description && <p className="cms-muted">{ct.description}</p>}
      <div className="cms-toolbar">
        <div className="cms-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.value}
              role="tab"
              aria-selected={status === t.value}
              className={`cms-tab${status === t.value ? ' is-active' : ''}`}
              onClick={() => { setStatus(t.value); setPage(1); }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <form className="cms-search" onSubmit={(e) => { e.preventDefault(); setSearch(searchInput.trim()); setPage(1); }}>
          <input className="cms-input" type="search" placeholder={`Search ${ct.label_plural.toLowerCase()}…`} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </form>
      </div>

      {loading ? (
        <Spinner />
      ) : result.error ? (
        <p className="cms-error">{result.error}</p>
      ) : result.items.length === 0 ? (
        <div className="cms-empty">
          <p>{search || status ? 'Nothing matches.' : `No ${ct.label_plural.toLowerCase()} yet.`}</p>
          {!search && !status && <Link className="cms-btn cms-btn--primary" href={`/admin/content/${type}/new`}>Create the first one</Link>}
        </div>
      ) : (
        <div className="cms-card cms-table-wrap">
          <table className="cms-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>SEO</th>
                <th>Readability</th>
                <th>Last edited</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((e) => (
                <tr key={e.id}>
                  <td>
                    <Link href={`/admin/content/${type}/${e.id}`} className="cms-table__title">{e.title}</Link>
                    <span className="cms-muted cms-table__path">/{e.path}</span>
                  </td>
                  <td><StatusBadge status={e.status} publishedAt={e.published_at} /></td>
                  <td><ScoreDot score={e.seo.seo_score} /></td>
                  <td><ScoreDot score={e.seo.readability_score} /></td>
                  <td className="cms-muted">{formatDate(e.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav className="cms-pager" aria-label="Pages">
          <button className="cms-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Previous</button>
          <span className="cms-muted">Page {page} of {pages}</span>
          <button className="cms-btn" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next →</button>
        </nav>
      )}
    </div>
  );
}

export function ScoreDot({ score }: { score: number | null | undefined }) {
  if (score == null) return <span className="cms-muted">—</span>;
  const rating = score >= 70 ? 'good' : score >= 40 ? 'ok' : 'bad';
  return (
    <span className={`cms-score cms-score--${rating}`} title={`${score}/100`}>
      <span className="cms-dot" aria-hidden="true" />
      {score}
    </span>
  );
}
