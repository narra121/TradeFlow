import { ContentPageShell } from '@/components/content/ContentPageShell';
import { A, Disclaimer, Faq, H2, P, ShortAnswer, SignupCta, Sources, Table, UL } from '@/content/components/ArticleParts';
import { getCompetitor, type Competitor } from '@/content/alternatives';
import { getSeoPage } from '@/content/seo-pages';
import { seoPageSchema } from '@/config/seo';
import { proPrice, TRIAL_DAYS } from '@/content/product-facts';

export function AlternativePage({ id }: { id: Competitor['id'] }) {
  const c = getCompetitor(id);
  const page = getSeoPage(`/alternatives/${id}`);
  const usd = proPrice('USD', 'month').display;
  const inr = proPrice('INR', 'month').display;

  return (
    <ContentPageShell
      title={page.title}
      description={page.description}
      path={page.path}
      jsonLd={seoPageSchema(page, [], c.faq)}
      type="article"
      publishedTime={page.publishedAt}
      modifiedTime={page.updatedAt}
    >
      <h1 className="mb-4 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">{c.name} alternative: TradeQut compared</h1>
      <ShortAnswer>
        {c.name} is {c.summary.charAt(0).toLowerCase() + c.summary.slice(1)} TradeQut is a smaller journal with a
        14-day free trial, Pro at {usd}/month ({inr}/month in India), file import for Indian brokers and rule tracking. Where {c.name} is
        stronger is listed below. Prices were checked on {c.checked}.
      </ShortAnswer>

      <H2>What we verified about {c.name}</H2>
      {c.facts.length > 0 && (
        <UL>
          {c.facts.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </UL>
      )}
      {c.unverified?.map((u) => (
        <P key={u}>{u}</P>
      ))}

      <H2>Where {c.name} is stronger</H2>
      <UL>
        {c.strongerAt.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </UL>

      <H2>Where TradeQut may fit better</H2>
      <UL>
        {c.tradequtFits.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </UL>

      <H2>Side by side</H2>
      <Table
        caption={`Checked ${c.checked}`}
        head={['Feature', c.name, 'TradeQut']}
        rows={[
          ['Free plan or trial', c.id === 'tradesviz' ? 'Free plan (stocks only, 1 account)' : c.id === 'tradezella' ? 'None advertised' : 'Not verified', `${TRIAL_DAYS}-day free trial with every Pro feature, then read-only`],
          [
            'Pro / paid price',
            c.id === 'tradezella'
              ? 'From $35/month'
              : c.id === 'tradesviz'
                ? 'From ₹1,400/month (₹980 in the promotion to 30 Nov 2026)'
                : 'Not verified (a third-party guide lists from $29.95/month)',
            `${usd}/month or ${inr}/month`,
          ],
          ['Broker connection', c.id === 'tradezella' ? 'Automatic sync' : 'See vendor page', 'File import (auto sync planned)'],
        ]}
      />
      <P>
        Not sure? <A to="/signup">Start a free TradeQut journal</A>, import your own broker file and compare the result
        with what you use today. More on <A to="/pricing">TradeQut pricing</A> and{' '}
        <A to="/alternatives">other alternatives</A>.
      </P>

      <Faq items={c.faq} />
      <Sources items={[{ label: `${c.name} pricing page`, url: c.pricingUrl, checked: c.checked }, ...(c.extraSources ?? [])]} />
      <Disclaimer>
        TradeQut is not affiliated with {c.name}. Prices and features change; the vendor pages above are the authority.
        TradeQut is a journaling tool, not investment advice.
      </Disclaimer>
      <SignupCta />
    </ContentPageShell>
  );
}
