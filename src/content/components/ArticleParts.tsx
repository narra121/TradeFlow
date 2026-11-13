import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { FaqItem } from '../product-facts';

/** Building blocks for articles and SEO pages; class names match the existing article styling. */

export function ShortAnswer({ children }: { children: ReactNode }) {
  return (
    <aside aria-label="Short answer" className="rounded-lg border border-primary/30 bg-primary/5 p-5 mb-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary mb-2">Short answer</p>
      <div className="text-foreground leading-relaxed">{children}</div>
    </aside>
  );
}

export function ScenarioNote({ children }: { children: ReactNode }) {
  return (
    <aside role="note" className="mb-8 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-foreground">
      {children}
    </aside>
  );
}

export function H2({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2 id={id} className="text-2xl font-semibold text-foreground mt-10 mb-4 scroll-mt-24">
      {children}
    </h2>
  );
}

export function H3({ children }: { children: ReactNode }) {
  return <h3 className="text-base font-semibold text-foreground mt-6 mb-3">{children}</h3>;
}

export function P({ children }: { children: ReactNode }) {
  return <p className="text-muted-foreground leading-relaxed mb-4">{children}</p>;
}

export function UL({ children }: { children: ReactNode }) {
  return <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed mb-4">{children}</ul>;
}

export function OL({ children }: { children: ReactNode }) {
  return <ol className="list-decimal pl-6 space-y-2 text-muted-foreground leading-relaxed mb-4">{children}</ol>;
}

export function A({ to, children }: { to: string; children: ReactNode }) {
  if (/^https?:\/\//.test(to)) {
    return (
      <a href={to} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 underline-offset-4 hover:underline">
        {children}
      </a>
    );
  }
  return (
    <Link to={to} className="text-primary hover:text-primary/80 underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}

export function Table({ head, rows, caption }: { head: ReactNode[]; rows: ReactNode[][]; caption?: string }) {
  return (
    <div className="overflow-x-auto mb-6 rounded-lg border border-border/60">
      <table className="w-full text-sm">
        {caption && <caption className="text-left text-xs text-muted-foreground px-3 py-2">{caption}</caption>}
        <thead className="bg-muted/40">
          <tr>
            {head.map((h, i) => (
              <th key={i} scope="col" className="text-left font-semibold text-foreground px-3 py-2 align-bottom">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border/50">
              {r.map((c, j) => (
                <td key={j} className="px-3 py-2 align-top text-muted-foreground">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Callout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/60 p-4 mb-6">
      <p className="font-semibold text-foreground mb-1">{title}</p>
      <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}

export function Faq({ items }: { items: FaqItem[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="faq" className="mt-10">
      <H2 id="faq">Frequently asked questions</H2>
      <div className="space-y-5">
        {items.map((f) => (
          <div key={f.question}>
            <h3 className="font-semibold text-foreground mb-1">{f.question}</h3>
            <p className="text-muted-foreground leading-relaxed">{f.answer}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export interface Source {
  label: string;
  url: string;
  /** YYYY-MM-DD the source was checked. */
  checked: string;
}

export function Sources({ items }: { items: Source[] }) {
  return (
    <section aria-labelledby="sources" className="mt-10">
      <h2 id="sources" className="text-base font-semibold text-foreground mb-3">
        Sources
      </h2>
      <ol className="list-decimal pl-6 space-y-1 text-sm text-muted-foreground">
        {items.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-foreground underline-offset-4 hover:underline">
              {s.label}
            </a>{' '}
            <span className="text-xs">(checked {s.checked})</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Disclaimer({ children }: { children?: ReactNode }) {
  return (
    <p className="mt-10 text-xs text-muted-foreground border-t border-border/50 pt-4 leading-relaxed">
      {children ??
        'Educational content only. TradeQut is a journaling and analytics tool, not a SEBI-registered investment adviser or research analyst, and nothing here is a recommendation to buy or sell any security. Rates, rules and prices change; check the linked primary sources before relying on a number.'}
    </p>
  );
}

export function SignupCta({ text = 'Start a free journal' }: { text?: string }) {
  return (
    <div className="signed-out-only mt-10 rounded-lg border border-primary/30 bg-primary/5 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <p className="text-foreground">Log your trades, see net P&amp;L after charges and find the rules you break most.</p>
      <Link
        to="/signup"
        className="glow-primary inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        {text}
      </Link>
    </div>
  );
}
