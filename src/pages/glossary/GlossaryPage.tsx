import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ContentPageShell } from '@/components/content/ContentPageShell';
import { glossarySchema } from '@/config/seo';
import { GLOSSARY_TERMS } from '@/content/glossary/terms';
import { Search } from 'lucide-react';

export function GlossaryPage() {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return GLOSSARY_TERMS;
    const q = search.toLowerCase();
    return GLOSSARY_TERMS.filter(
      (t) => t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q)
    );
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
      description="Comprehensive glossary of trading terms: win rate, profit factor, drawdown, pip, leverage, and 25+ more. Clear definitions with formulas and examples."
      path="/glossary"
      jsonLd={glossarySchema(GLOSSARY_TERMS)}
      navLabel="Glossary navigation"
    >
      <div className="text-center mb-12 sm:mb-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Trading Glossary</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Essential trading terms explained clearly. From basic concepts to advanced metrics — everything you need to understand your trading journal.
        </p>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search terms..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border/50 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {letters.map(([letter]) => (
          <a
            key={letter}
            href={`#letter-${letter}`}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-card border border-border/50 text-sm font-medium text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
          >
            {letter}
          </a>
        ))}
      </div>

      <div className="space-y-12">
        {letters.map(([letter, terms]) => (
          <section key={letter} id={`letter-${letter}`}>
            <h2 className="text-2xl font-bold text-primary mb-6 border-b border-border/50 pb-2">{letter}</h2>
            <div className="space-y-6">
              {terms.map((term) => (
                <div key={term.id} id={term.id} className="bg-card rounded-xl border border-border/50 p-6 scroll-mt-24">
                  <h3 className="text-xl font-semibold text-foreground mb-2">{term.term}</h3>
                  <p className="text-muted-foreground leading-relaxed mb-3">{term.definition}</p>
                  {term.formula && (
                    <div className="bg-background rounded-lg px-4 py-2 mb-3 font-mono text-sm text-foreground">
                      {term.formula}
                    </div>
                  )}
                  {term.example && (
                    <p className="text-sm text-muted-foreground italic mb-3">{term.example}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {term.relatedTerms.map((rt) => (
                      <a key={rt} href={`#${rt}`} className="text-xs text-primary hover:text-primary/80 transition-colors">
                        #{GLOSSARY_TERMS.find((t) => t.id === rt)?.term ?? rt}
                      </a>
                    ))}
                    {term.relatedArticles.map((slug) => (
                      <Link key={slug} to={`/blog/${slug}`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        Read more →
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </ContentPageShell>
  );
}
