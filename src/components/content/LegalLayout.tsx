import type { ReactNode } from 'react';
import { ContentPageShell } from './ContentPageShell';

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

interface LegalLayoutProps {
  title: string;
  description: string;
  path: string;
  /** Shown as "Last updated"; YYYY-MM-DD. */
  updated: string;
  sections: LegalSection[];
}

export function LegalLayout({ title, description, path, updated, sections }: LegalLayoutProps) {
  const date = new Date(`${updated}T00:00:00`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  return (
    <ContentPageShell
      title={`${title} - TradeQut`}
      description={description}
      path={path}
      jsonLd={{ '@context': 'https://schema.org', '@type': 'WebPage', name: title, url: `https://tradequt.com${path}`, dateModified: updated }}
    >
      <h1 className="mb-2 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">{title}</h1>
      <p className="mb-8 text-muted-foreground">
        Last updated: <time dateTime={updated}>{date}</time>
      </p>

      <nav aria-label="Contents" className="panel mb-10 p-4">
        <h2 className="mb-2 text-sm font-semibold text-foreground">Contents</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="inline-flex min-h-6 items-center text-primary hover:underline">
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-10">
        {sections.map((s, i) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-20">
            <h2 id={`${s.id}-h`} className="mb-3 text-xl font-semibold text-foreground">
              {i + 1}. {s.title}
            </h2>
            <div className="space-y-3 leading-relaxed text-foreground-soft [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6">{s.body}</div>
          </section>
        ))}
      </div>
    </ContentPageShell>
  );
}

export function ContactBlock() {
  return (
    <ul className="!list-none !pl-0">
      <li>
        <span className="font-medium text-foreground">Business:</span> TradeQutJournal
      </li>
      <li>
        <span className="font-medium text-foreground">Address:</span> 3-187/2, Regonda, Regonda, Bhupalpally, Telangana - 506348
      </li>
      <li>
        <span className="font-medium text-foreground">Email:</span>{' '}
        <a href="mailto:support@tradequt.com" className="text-primary hover:underline">
          support@tradequt.com
        </a>
      </li>
      <li>
        <span className="font-medium text-foreground">Phone:</span>{' '}
        <a href="tel:+918501018125" className="text-primary hover:underline">
          +91 8501018125
        </a>
      </li>
    </ul>
  );
}
