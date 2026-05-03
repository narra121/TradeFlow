import { useParams, Navigate } from 'react-router-dom';
import { Suspense, lazy, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { ContentPageShell } from '@/components/content/ContentPageShell';
import { AuthorBox } from '@/components/content/AuthorBox';
import { ShareButtons } from '@/components/content/ShareButtons';
import { caseStudySchema } from '@/config/seo';
import { CASE_STUDIES } from '@/content/case-studies/studies';

export function CaseStudyPage() {
  const { slug } = useParams<{ slug: string }>();
  const study = CASE_STUDIES.find((s) => s.slug === slug);

  const Content = useMemo(() => {
    if (!study) return null;
    return lazy(study.content);
  }, [study]);

  if (!study || !Content) {
    return <Navigate to="/case-studies" replace />;
  }

  return (
    <ContentPageShell
      title={`${study.title} - TradeQut`}
      description={study.description}
      path={`/case-studies/${study.slug}`}
      jsonLd={caseStudySchema(study)}
      navLabel="Case study navigation"
    >
      <header className="mb-8">
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
            {study.traderType}
          </span>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
            {study.market}
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">{study.title}</h1>
        <p className="text-lg text-muted-foreground leading-relaxed mb-6">{study.description}</p>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <AuthorBox publishedAt={study.publishedAt} readingTime={4} />
          <ShareButtons title={study.title} url={`/case-studies/${study.slug}`} />
        </div>
      </header>

      <div className="bg-card rounded-xl border border-primary/20 p-6 mb-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-sm text-muted-foreground">Trader Type</p>
            <p className="text-sm font-semibold text-foreground mt-1">{study.traderType}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Market</p>
            <p className="text-sm font-semibold text-foreground mt-1">{study.market}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Duration</p>
            <p className="text-sm font-semibold text-foreground mt-1">{study.duration}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Key Result</p>
            <p className="text-sm font-semibold text-primary mt-1">{study.keyResult}</p>
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
