import { ContentPageShell } from '@/components/content/ContentPageShell';
import { CHANGELOG_SCHEMA } from '@/config/seo';
import { CHANGELOG_ENTRIES, type ChangelogEntry } from '@/content/changelog/entries';
import { cn } from '@/lib/utils';

const TYPE_CONFIG = {
  feature: { label: 'New', color: 'bg-profit/10 text-profit' },
  improvement: { label: 'Improved', color: 'bg-info/10 text-info' },
  fix: { label: 'Fixed', color: 'bg-warning/10 text-warning' },
} as const;

function monthLabel(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

function groupByMonth(entries: ChangelogEntry[]): { month: string; entries: ChangelogEntry[] }[] {
  const groups: { month: string; entries: ChangelogEntry[] }[] = [];
  for (const entry of entries) {
    const month = monthLabel(entry.date);
    const last = groups[groups.length - 1];
    if (last?.month === month) last.entries.push(entry);
    else groups.push({ month, entries: [entry] });
  }
  return groups;
}

export function ChangelogPage() {
  return (
    <ContentPageShell
      title="Changelog - TradeQut Product Updates"
      description="What changed in TradeQut: new features, improvements and fixes, newest first."
      path="/changelog"
      jsonLd={CHANGELOG_SCHEMA}
    >
      <header className="mb-10">
        <h1 className="mb-3 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">Changelog</h1>
        <p className="text-base text-muted-foreground">What changed in TradeQut, newest first.</p>
      </header>

      {groupByMonth(CHANGELOG_ENTRIES).map((group) => (
        <section key={group.month} aria-labelledby={`m-${group.month.replace(/\s/g, '-')}`} className="mb-10">
          <h2 id={`m-${group.month.replace(/\s/g, '-')}`} className="mb-4 border-b border-border pb-2 text-lg font-semibold text-foreground">
            {group.month}
          </h2>
          <div className="space-y-6">
            {group.entries.map((entry) => (
              <article key={entry.version} className="panel p-5">
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <span className="num rounded bg-secondary px-2 py-0.5 text-xs font-semibold text-foreground">v{entry.version}</span>
                  <time dateTime={entry.date} className="text-sm text-muted-foreground">
                    {new Date(`${entry.date}T00:00:00`).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </time>
                </div>
                <h3 className="mb-3 text-base font-semibold text-foreground">{entry.title}</h3>
                <ul className="space-y-2">
                  {entry.changes.map((change) => {
                    const config = TYPE_CONFIG[change.type];
                    return (
                      <li key={change.text} className="flex items-start gap-3">
                        <span className={cn('mt-0.5 inline-flex h-5 shrink-0 items-center rounded px-1.5 text-xs font-medium', config.color)}>
                          {config.label}
                        </span>
                        <span className="text-foreground-soft">{change.text}</span>
                      </li>
                    );
                  })}
                </ul>
              </article>
            ))}
          </div>
        </section>
      ))}
    </ContentPageShell>
  );
}
