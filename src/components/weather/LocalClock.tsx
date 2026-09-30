'use client';

import { useEffect, useState } from 'react';

const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kathmandu', hour: '2-digit', minute: '2-digit', hour12: false });

/** Current time in Nepal (UTC+5:45). Rendered after hydration so server and client HTML match. */
export function LocalClock() {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setTime(fmt.format(new Date()));
    tick();
    const id = window.setInterval(tick, 20_000);
    return () => clearInterval(id);
  }, []);
  return <time suppressHydrationWarning>{time ?? '--:--'}</time>;
}
