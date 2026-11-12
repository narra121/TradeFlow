import { useState } from 'react';
import { ContentPageShell } from '@/components/content/ContentPageShell';
import { ArticleCard } from '@/components/content/ArticleCard';
import { TagFilter } from '@/components/content/TagFilter';
import { BLOG_INDEX_SCHEMA } from '@/config/seo';
import { BLOG_ARTICLES, ALL_TAGS } from '@/content/blog/articles';

const TAG_COUNTS = BLOG_ARTICLES.flatMap((a) => a.tags).reduce<Record<string, number>>((acc, t) => ({ ...acc, [t]: (acc[t] ?? 0) + 1 }), {});

export function BlogIndexPage() {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const filtered = activeTag
    ? BLOG_ARTICLES.filter((a) => a.tags.includes(activeTag))
    : BLOG_ARTICLES;

  return (
    <ContentPageShell
      title="TradeQut Blog - Trading Journal, Risk and F&O Guides"
      description="Guides on trading journaling, analytics, charges, risk and discipline: Zerodha tradebook, F&O charges, R multiples, drawdown and more."
      path="/blog"
      jsonLd={BLOG_INDEX_SCHEMA}
      maxWidth="max-w-5xl"
    >
      <header className="mb-10">
        <h1 className="mb-3 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">Blog</h1>
        <p className="max-w-2xl text-base text-foreground-soft">
          Guides on journaling, charges, risk and review habits. Educational only, not investment advice.
        </p>
      </header>

      <div className="mb-8">
        <TagFilter tags={ALL_TAGS} activeTag={activeTag} onTagChange={setActiveTag} counts={TAG_COUNTS} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((article) => (
          <ArticleCard
            key={article.slug}
            title={article.title}
            description={article.description}
            href={`/blog/${article.slug}`}
            tags={article.tags}
            readingTime={article.readingTime}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No articles found for this tag.</p>
        </div>
      )}
    </ContentPageShell>
  );
}
