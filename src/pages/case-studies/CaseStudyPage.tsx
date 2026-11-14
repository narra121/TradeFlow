import { useParams } from 'react-router-dom';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { ContentPageShell } from '@/components/content/ContentPageShell';
import { AuthorBox } from '@/components/content/AuthorBox';
import { ShareButtons } from '@/components/content/ShareButtons';
import { caseStudySchema } from '@/config/seo';
import { CASE_STUDIES } from '@/content/case-studies/studies';
import { lazyContent } from '@/content/lazyContent';
import NotFound from '@/pages/NotFound';

export function CaseStudyPage() {
  const { slug } = useParams<{ slug: string }>();
  const study = CASE_STUDIES.find((s) => s.slug === slug);

  const Content = study ? lazyContent(`case-study/${study.slug}`, study.content) : null;

  // A real not-found page, matching the 404 CloudFront answers for a path that was never prerendered.
  if (!study || !Content) return <NotFound />;

  return (
    <ContentPageShell
      title={`${study.title} - TradeQut`}
      description={study.description}
      path={`/case-studies/${study.slug}`}
      jsonLd={caseStudySchema(study)}
      type="article"
      publishedTime={study.publishedAt}
      modifiedTime={study.updatedAt ?? study.publishedAt}
    >
      <header className="mb-8">
        <p className="mb-4 text-xs text-muted-foreground">
          {study.traderType} · {study.market}
        </p>
        <h1 className="text-[32px] font-semibold leading-tight text-foreground sm:text-[40px] mb-4">{study.title}</h1>
        <p className="text-base text-muted-foreground leading-relaxed mb-6">{study.description}</p>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <AuthorBox publishedAt={study.updatedAt ?? study.publishedAt} readingTime={4} />
          <ShareButtons title={study.title} url={`/case-studies/${study.slug}`} />
        </div>
      </header>

      <div className="panel p-4 mb-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Scenario about</p>
            <p className="text-sm font-semibold text-foreground mt-1">{study.traderType}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Market</p>
            <p className="text-sm font-semibold text-foreground mt-1">{study.market}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Sample</p>
            <p className="text-sm font-semibold text-foreground mt-1">{study.duration}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Method</p>
            <p className="text-sm font-semibold text-foreground mt-1">{study.method}</p>
          </div>
        </div>
      </div>

      <div className="prose-custom">
        <Suspense
          fallback={
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <Content />
        </Suspense>
      </div>
    </ContentPageShell>
  );
}
