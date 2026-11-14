import { Suspense, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { ArticleToc } from '@/components/content/ArticleToc';
import { AuthorBox } from '@/components/content/AuthorBox';
import { ContentPageShell } from '@/components/content/ContentPageShell';
import { RelatedArticles } from '@/components/content/RelatedArticles';
import { ShareButtons } from '@/components/content/ShareButtons';
import { blogArticleSchema, pageTitle } from '@/config/seo';
import { BLOG_ARTICLES, getRelatedArticles } from '@/content/blog/articles';
import { Faq, RelatedLinks, ShortAnswer, SignupCta } from '@/content/components/ArticleParts';
import { SEE_ALSO } from '@/content/blog/see-also';
import { lazyContent } from '@/content/lazyContent';
import NotFound from '@/pages/NotFound';

export function BlogArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const article = BLOG_ARTICLES.find((a) => a.slug === slug);
  const bodyRef = useRef<HTMLDivElement>(null);

  // A real not-found page, matching the 404 CloudFront answers for a path that was never prerendered.
  if (!article) return <NotFound />;

  const ContentComponent = lazyContent(`blog/${article.slug}`, article.content);
  const related = getRelatedArticles(article.slug, 3);
  const modified = article.updatedAt ?? article.publishedAt;

  return (
    <ContentPageShell
      title={pageTitle(article.title, ' - TradeQut Blog')}
      description={article.description}
      path={`/blog/${article.slug}`}
      jsonLd={blogArticleSchema(article)}
      type="article"
      publishedTime={article.publishedAt}
      modifiedTime={modified}
      maxWidth="max-w-[62ch]"
    >
      <Link to="/blog" className="mb-6 inline-flex min-h-6 max-md:min-h-11 items-center gap-1 text-sm text-foreground-soft hover:text-foreground">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Blog
      </Link>

      <header className="mb-8">
        <p className="mb-4 text-xs capitalize text-muted-foreground">{article.tags.join(' · ')}</p>
        <h1 className="mb-4 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">{article.title}</h1>
        <p className="mb-6 text-base text-foreground-soft">{article.description}</p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <AuthorBox publishedAt={modified} updated={!!article.updatedAt} readingTime={article.readingTime} />
          <ShareButtons title={article.title} url={`/blog/${article.slug}`} />
        </div>
      </header>

      <div ref={bodyRef} className="border-t border-border pt-8">
        {article.summary && <ShortAnswer>{article.summary}</ShortAnswer>}
        <ArticleToc root={bodyRef} />
        <Suspense
          fallback={
            <div role="status" className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">Loading article</span>
            </div>
          }
        >
          <ContentComponent />
        </Suspense>
        {article.faq && <Faq items={article.faq} />}
        <RelatedLinks links={SEE_ALSO[article.slug] ?? []} />
      </div>

      <SignupCta text="Start free" />
      <RelatedArticles articles={related} />
    </ContentPageShell>
  );
}
