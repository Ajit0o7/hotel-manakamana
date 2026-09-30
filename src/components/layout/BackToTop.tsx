'use client';

import { scrollToTop } from '@/lib/scroll-lock';

export function BackToTop() {
  return (
    <button className="to-top" type="button" onClick={scrollToTop}>
      Back to top <span aria-hidden="true">↑</span>
    </button>
  );
}
