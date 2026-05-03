import { useState } from 'react';
import { ContentPageShell } from '@/components/content/ContentPageShell';
import { ArticleCard } from '@/components/content/ArticleCard';
import { TagFilter } from '@/components/content/TagFilter';
import { BLOG_INDEX_SCHEMA } from '@/config/seo';
import { BLOG_ARTICLES, ALL_TAGS } from '@/content/blog/articles';

export function BlogIndexPage() {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const filtered = activeTag
    ? BLOG_ARTICLES.filter((a) => a.tags.includes(activeTag))
    : BLOG_ARTICLES;

  return (
    <ContentPageShell
      title="TradeQut Blog - Trading Journal Tips, Strategies & Analytics"
      description="Expert articles on trading journaling, analytics, psychology, and strategies. Learn how to track trades, improve win rate, and build discipline."
      path="/blog"
      jsonLd={BLOG_INDEX_SCHEMA}
      navLabel="Blog navigation"
      maxWidth="max-w-5xl"
    >
      <div className="text-center mb-12 sm:mb-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Trading Journal Blog</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Tips, strategies, and insights to help you become a more disciplined and profitable trader
          through better journaling and analytics.
        </p>
      </div>

      <div className="mb-8">
        <TagFilter tags={ALL_TAGS} activeTag={activeTag} onTagChange={setActiveTag} />
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
