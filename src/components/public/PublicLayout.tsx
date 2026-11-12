import { useEffect, type ReactNode } from 'react';
import { PublicFooter } from './PublicFooter';
import { PublicHeader } from './PublicHeader';
import { useHashScroll } from './useHashScroll';

/** The one frame of every public page: skip link, sticky header, main landmark, footer. */
export function PublicLayout({ children }: { children: ReactNode }) {
  useHashScroll();
  // WCAG 2.4.11: the sticky 56 px header must not cover a focused element when the browser scrolls it into view.
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.scrollPaddingTop;
    root.style.scrollPaddingTop = '4.5rem';
    return () => {
      root.style.scrollPaddingTop = previous;
    };
  }, []);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <PublicHeader />
      <main id="main-content">{children}</main>
      <PublicFooter />
    </div>
  );
}
