import { Link } from 'react-router-dom';
import { ContentPageShell } from '@/components/content/ContentPageShell';
import { Disclaimer, H2, P, ShortAnswer } from '@/content/components/ArticleParts';
import { COMPETITORS } from '@/content/alternatives';
import { getSeoPage } from '@/content/seo-pages';
import { seoPageSchema } from '@/config/seo';

export default function AlternativesIndexPage() {
  const page = getSeoPage('/alternatives');
  return (
    <ContentPageShell
      title={page.title}
      description={page.description}
      path={page.path}
      jsonLd={seoPageSchema(page)}
      maxWidth="max-w-4xl"
    >
      <h1 className="mb-4 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">Trading journal alternatives compared</h1>
      <ShortAnswer>
        Three popular trading journals compared with TradeQut using prices and features read from the vendors&apos; own
        pages on 12 November 2026. Each page says where the other product is stronger and what we could not verify.
      </ShortAnswer>

      <H2>Comparisons</H2>
      <ul className="grid gap-4 sm:grid-cols-3">
        {COMPETITORS.map((c) => (
          <li key={c.id} className="panel p-4">
            <h3 className="font-semibold text-foreground">
              <Link to={`/alternatives/${c.id}`} className="hover:underline">
                {c.name} alternative
              </Link>
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">{c.summary}</p>
          </li>
        ))}
      </ul>

      <H2>How we compare</H2>
      <P>
        We read each vendor&apos;s public pricing and help pages, record the date, and quote them. Where a page could not
        be read, we say so instead of guessing. We do not claim a competitor lacks a feature unless its own page says so.
      </P>
      <Disclaimer>
        TradeQut is not affiliated with the products compared. Check the vendors&apos; pages for current prices.
      </Disclaimer>
    </ContentPageShell>
  );
}
