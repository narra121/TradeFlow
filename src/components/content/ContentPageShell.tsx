import type { ReactNode } from 'react';
import { PublicLayout } from '@/components/public/PublicLayout';
import { SEO } from '@/components/SEO';

interface ContentPageShellProps {
  title: string;
  description: string;
  path: string;
  jsonLd: object;
  /** Superseded by the shared header's `Main` landmark; accepted so existing callers compile. */
  navLabel?: string;
  /** Tailwind max-width class for the content column; default is a 72ch reading measure. */
  maxWidth?: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  noindex?: boolean;
  children: ReactNode;
}

export function ContentPageShell({
  title,
  description,
  path,
  jsonLd,
  maxWidth = 'max-w-[72ch]',
  type,
  publishedTime,
  modifiedTime,
  noindex,
  children,
}: ContentPageShellProps) {
  return (
    <>
      <SEO
        title={title}
        description={description}
        path={path}
        jsonLd={jsonLd}
        type={type}
        publishedTime={publishedTime}
        modifiedTime={modifiedTime}
        noindex={noindex}
      />
      <PublicLayout>
        <article className="px-4 pb-16 pt-10 sm:px-6 sm:pt-12">
          <div className={`${maxWidth} mx-auto`}>{children}</div>
        </article>
      </PublicLayout>
    </>
  );
}
