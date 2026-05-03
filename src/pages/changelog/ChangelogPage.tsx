import { ContentPageShell } from '@/components/content/ContentPageShell';
import { CHANGELOG_SCHEMA } from '@/config/seo';
import { CHANGELOG_ENTRIES } from '@/content/changelog/entries';
import { Sparkles, Wrench, Bug } from 'lucide-react';
import { cn } from '@/lib/utils';

const TYPE_CONFIG = {
  feature: { label: 'New', icon: Sparkles, color: 'bg-success/10 text-success' },
  improvement: { label: 'Improved', icon: Wrench, color: 'bg-primary/10 text-primary' },
  fix: { label: 'Fixed', icon: Bug, color: 'bg-warning/10 text-warning' },
} as const;

export function ChangelogPage() {
  return (
    <ContentPageShell
      title="Changelog - TradeQut Product Updates"
      description="See what is new in TradeQut. Product updates, new features, improvements, and bug fixes for your trading journal."
      path="/changelog"
      jsonLd={CHANGELOG_SCHEMA}
      navLabel="Changelog navigation"
    >
      <div className="text-center mb-12 sm:mb-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Changelog</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Every update to TradeQut. New features, improvements, and fixes — shipped regularly to help you trade better.
        </p>
      </div>

      <div className="space-y-8">
        {CHANGELOG_ENTRIES.map((entry) => (
          <div key={entry.version} className="bg-card rounded-2xl border border-border/50 p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                v{entry.version}
              </span>
              <span className="text-sm text-muted-foreground">
                {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-4">{entry.title}</h2>
            <ul className="space-y-2">
              {entry.changes.map((change, i) => {
                const config = TYPE_CONFIG[change.type];
                return (
                  <li key={i} className="flex items-start gap-3">
                    <span className={cn('shrink-0 text-xs font-medium px-2 py-0.5 rounded-full mt-0.5', config.color)}>
                      {config.label}
                    </span>
                    <span className="text-muted-foreground">{change.text}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </ContentPageShell>
  );
}
