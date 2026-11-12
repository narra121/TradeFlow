import { ContentPageShell } from '@/components/content/ContentPageShell';
import { ArticleCard } from '@/components/content/ArticleCard';
import { CASE_STUDIES_INDEX_SCHEMA } from '@/config/seo';
import { CASE_STUDIES } from '@/content/case-studies/studies';

export function CaseStudiesIndexPage() {
  return (
    <ContentPageShell
      title="Journaling Scenarios (Illustrative) - TradeQut"
      description="Illustrative walk-throughs of how a trading journal exposes common problems: losing hours, revenge trades, loss limits. Hypothetical data, not real customers."
      path="/case-studies"
      jsonLd={CASE_STUDIES_INDEX_SCHEMA}
      maxWidth="max-w-5xl"
    >
      <header className="mb-12">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
          Journaling scenarios (illustrative)
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
          Worked examples of questions a trading journal can answer. Every scenario uses hypothetical data: no real
          customers, no results to expect.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {CASE_STUDIES.map((study) => (
          <ArticleCard
            key={study.slug}
            title={study.title}
            description={study.description}
            href={`/case-studies/${study.slug}`}
            tags={[study.traderType, study.market]}
            meta={study.method}
          />
        ))}
      </div>
    </ContentPageShell>
  );
}
