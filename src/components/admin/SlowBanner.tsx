'use client';

import { useEffect, useState } from 'react';
import { onSlowRequests } from '@/lib/cms/api';

/** Explains the wait when the free CMS server is waking up from sleep. */
export function SlowBanner() {
  const [slow, setSlow] = useState(false);
  useEffect(() => onSlowRequests(setSlow), []);
  if (!slow) return null;
  return (
    <div className="cms-slow" role="status">
      <span className="cms-spinner" aria-hidden="true" />
      Waking up the CMS server… It sleeps when nobody uses it, so the first request can take up to a minute.
    </div>
  );
}
