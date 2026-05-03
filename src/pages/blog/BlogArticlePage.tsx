import { useParams, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { ContentPageShell } from '@/components/content/ContentPageShell';
import { AuthorBox } from '@/components/content/AuthorBox';
import { ShareButtons } from '@/components/content/ShareButtons';
import { RelatedArticles } from '@/components/content/RelatedArticles';
import { blogArticleSchema } from '@/config/seo';
import { BLOG_ARTICLES, getRelatedArticles } from '@/content/blog/articles';

export function BlogArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const article = BLOG_ARTICLES.find((a) => a.slug === slug);

  if (!article) {
    return <Navigate to="/blog" replace />;
  }

  const ContentComponent = lazy(article.content);
  const related = getRelatedArticles(article.slug, 3);

  return (
    <ContentPageShell
      title={`${article.title} - TradeQut Blog`}
      description={article.description}
      path={`/blog/${article.slug}`}
      jsonLd={blogArticleSchema(article)}
      navLabel="Blog article navigation"
    >
      <div className="mb-8">
        <div className="flex flex-wrap gap-2 mb-4">
          {article.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary capitalize"
            >
              {tag}
            </span>
          ))}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">{article.title}</h1>
        <p className="text-lg text-muted-foreground mb-6">{article.description}</p>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <AuthorBox publishedAt={article.publishedAt} readingTime={article.readingTime} />
          <ShareButtons title={article.title} url={`/blog/${article.slug}`} />
        </div>
      </div>

      <div className="border-t border-border/50 pt-8">
        <Suspense
          fallback={
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <ContentComponent />
        </Suspense>
      </div>

      <RelatedArticles articles={related} />
    </ContentPageShell>
  );
}
