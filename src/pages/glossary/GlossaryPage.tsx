import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { ContentPageShell } from '@/components/content/ContentPageShell';
import { glossarySchema } from '@/config/seo';
import { GLOSSARY_TERMS } from '@/content/glossary/terms';

export function GlossaryPage() {
  const [search, setSearch] = useState('');
  const searchId = useId();

  const filtered = useMemo(() => {
    if (!search) return GLOSSARY_TERMS;
    const q = search.toLowerCase();
    return GLOSSARY_TERMS.filter((t) => t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q));
  }, [search]);

  const letters = useMemo(() => {
    const map = new Map<string, typeof GLOSSARY_TERMS>();
    for (const term of filtered) {
      const letter = term.term[0].toUpperCase();
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(term);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <ContentPageShell
      title="Trading Glossary - Key Terms & Definitions | TradeQut"
      description="Glossary of trading terms: win rate, profit factor, drawdown, pip, leverage and more. Clear definitions with formulas and examples."
      path="/glossary"
      jsonLd={glossarySchema(GLOSSARY_TERMS)}
    >
      <header className="mb-8">
        <h1 className="mb-3 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">Trading glossary</h1>
        <p className="text-base text-foreground-soft">Trading terms explained, with formulas and examples.</p>
      </header>

      <div className="relative mb-2">
        <label htmlFor={searchId} className="sr-only">
          Search terms
        </label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          id={searchId}
          type="search"
          placeholder="Search terms..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 max-md:h-11 w-full rounded-md border border-input bg-card pl-10 pr-3 text-foreground placeholder:text-muted-foreground"
        />
      </div>
      <p role="status" className="mb-4 text-sm text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? 'term' : 'terms'}
      </p>
      {filtered.length === 0 && (
        <div className="mb-8">
          <p className="text-foreground-soft">No terms match &ldquo;{search}&rdquo;.</p>
          <button
            type="button"
            onClick={() => setSearch('')}
            className="mt-2 inline-flex h-9 items-center rounded-md border border-border-strong px-3 text-sm font-medium text-foreground hover:bg-secondary"
          >
            Clear search
          </button>
        </div>
      )}

      <nav aria-label="Jump to letter" className="sticky top-14 z-30 -mx-4 mb-8 flex flex-wrap gap-1 border-b border-border bg-background px-4 py-2 sm:-mx-6 sm:px-6">
        {letters.map(([letter]) => (
          <a
            key={letter}
            href={`#letter-${letter}`}
            className="flex h-11 w-11 items-center justify-center rounded-md text-sm font-medium text-foreground-soft hover:bg-secondary hover:text-foreground sm:h-8 sm:w-8"
          >
            {letter}
          </a>
        ))}
      </nav>

      <div className="space-y-10">
        {letters.map(([letter, terms]) => (
          <section key={letter} id={`letter-${letter}`} aria-labelledby={`h-${letter}`} className="scroll-mt-32">
            <h2 id={`h-${letter}`} className="mb-4 border-b border-border pb-2 text-xl font-semibold text-primary">
              {letter}
            </h2>
            <dl className="space-y-6">
              {terms.map((term) => (
                <div key={term.id} className="scroll-mt-32">
                  <dt>
                    <h3 id={term.id} className="scroll-mt-32 text-lg font-semibold text-foreground">
                      {term.term}
                    </h3>
                  </dt>
                  <dd className="mt-1">
                    <p className="leading-relaxed text-foreground-soft">{term.definition}</p>
                    {term.formula && <p className="num my-3 rounded bg-card px-3 py-2 text-sm text-foreground">{term.formula}</p>}
                    {term.example && <p className="mt-2 text-sm italic text-muted-foreground">{term.example}</p>}
                    <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      {term.relatedTerms.length > 0 && <span className="text-muted-foreground">See also:</span>}
                      {term.relatedTerms.map((rt) => (
                        <a key={rt} href={`#${rt}`} className="inline-flex min-h-6 max-md:min-h-11 min-w-6 items-center justify-center text-primary hover:underline">
                          {GLOSSARY_TERMS.find((t) => t.id === rt)?.term ?? rt}
                        </a>
                      ))}
                      {term.relatedArticles.map((slug) => (
                        <Link key={slug} to={`/blog/${slug}`} className="inline-flex min-h-6 max-md:min-h-11 items-center text-foreground-soft hover:text-foreground">
                          Read more &rarr;
                        </Link>
                      ))}
                    </p>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </ContentPageShell>
  );
}
