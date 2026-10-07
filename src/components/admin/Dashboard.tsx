'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiList, query } from '@/lib/cms/api';
import type { ContentType, Entry, Media } from '@/lib/cms/types';
import { useAuth } from './AuthProvider';
import { Spinner } from './Spinner';
import { useContentTypes } from './TypesProvider';

interface Counts {
  published: number;
  drafts: number;
}

export function Dashboard() {
  const { types, error } = useContentTypes();
  const { email } = useAuth();
  const [mediaTotal, setMediaTotal] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiList<Media>('/api/v1/admin/media?per_page=1')
      .then(({ meta }) => !cancelled && setMediaTotal(meta.total))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p className="cms-error">{error}</p>;
  if (!types) return <Spinner />;

  return (
    <div className="cms-page">
      <header className="cms-page__head">
        <h1 className="cms-h1">Welcome back</h1>
      </header>
      <p className="cms-muted">Signed in as {email}. Manage the website&apos;s pages, posts and photos here.</p>
      <div className="cms-cards">
        {types.map((t) => <TypeCard key={t.name} type={t} />)}
        <div className="cms-card cms-stat">
          <h2 className="cms-h2">Media library</h2>
          <p className="cms-stat__num">{mediaTotal ?? '…'}</p>
          <p className="cms-muted">files</p>
          <div className="cms-row">
            <Link className="cms-btn cms-btn--primary" href="/admin/media">Open library</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function TypeCard({ type }: { type: ContentType }) {
  const [counts, setCounts] = useState<Counts | null>(null);
  useEffect(() => {
    let cancelled = false;
    const count = (status: string) =>
      apiList<Entry>(`/api/v1/admin/content/${type.name}${query({ status, per_page: 1 })}`).then((r) => r.meta.total);
    Promise.all([count('published'), count('draft')])
      .then(([published, drafts]) => !cancelled && setCounts({ published, drafts }))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [type.name]);

  return (
    <div className="cms-card cms-stat">
      <h2 className="cms-h2">{type.label_plural}</h2>
      <p className="cms-stat__num">{counts ? counts.published : '…'}</p>
      <p className="cms-muted">published{counts && counts.drafts > 0 ? ` · ${counts.drafts} draft${counts.drafts === 1 ? '' : 's'}` : ''}</p>
      <div className="cms-row">
        {type.name === 'settings' ? (
          <Link className="cms-btn cms-btn--primary" href={`/admin/content/${type.name}`}>Open</Link>
        ) : (
          <>
            <Link className="cms-btn cms-btn--primary" href={`/admin/content/${type.name}/new`}>Add {type.label.toLowerCase()}</Link>
            <Link className="cms-btn" href={`/admin/content/${type.name}`}>View all</Link>
          </>
        )}
      </div>
    </div>
  );
}
