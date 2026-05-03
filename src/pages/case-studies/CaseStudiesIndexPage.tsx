import { ContentPageShell } from '@/components/content/ContentPageShell';
import { ArticleCard } from '@/components/content/ArticleCard';
import { CASE_STUDIES_INDEX_SCHEMA } from '@/config/seo';
import { CASE_STUDIES } from '@/content/case-studies/studies';

export function CaseStudiesIndexPage() {
  return (
    <ContentPageShell
      title="Trading Success Stories | Case Studies - TradeQut"
      description="Real stories of traders who improved their performance with disciplined journaling and analytics. See how day traders, prop traders, and swing traders transformed their results."
      path="/case-studies"
      jsonLd={CASE_STUDIES_INDEX_SCHEMA}
      navLabel="Case studies navigation"
      maxWidth="max-w-5xl"
    >
      <header className="mb-12">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
          Trading Success Stories
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
          How real traders improved consistency, passed prop firm challenges, and found hidden edges
          through disciplined journaling and data-driven analysis.
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
            meta={study.keyResult}
          />
        ))}
      </div>
    </ContentPageShell>
  );
}
