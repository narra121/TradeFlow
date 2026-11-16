import { ContentPageShell } from '@/components/content/ContentPageShell';
import { A, Crumbs, Disclaimer, Faq, H2, P, ShortAnswer, SignupCta, Sources, Table, UL } from '@/content/components/ArticleParts';
import { COMPETITORS, getCompetitor, type Competitor } from '@/content/alternatives';
import { BROKER_PAGES } from '@/content/brokers';
import { METATRADER_PAGES } from '@/content/forex-platforms';
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
      {page.parent && <Crumbs parent={page.parent} current={page.label} />}
      <h1 className="mb-4 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">{c.name} alternative: TradeQut compared</h1>
      <ShortAnswer>
        {c.name} is {c.summary.charAt(0).toLowerCase() + c.summary.slice(1)} TradeQut is a smaller journal with a
        14-day free trial, Pro at {usd}/month ({inr}/month in India), file import for MetaTrader 4/5 and Indian brokers, and rule tracking. Where{' '}
        {c.name} is stronger is listed below. Prices were checked on {c.checked}.
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
          ['Free plan or trial', c.table.free, `${TRIAL_DAYS}-day free trial with every Pro feature, then read-only`],
          ['Pro / paid price', c.table.price, `${usd}/month or ${inr}/month`],
          ['Broker connection', c.table.connection, 'File import (auto sync planned)'],
        ]}
      />
      <H2>If you trade forex</H2>
      <P>
        TradeQut reads the{' '}
        {METATRADER_PAGES.map((m, i) => (
          <span key={m.id}>
            <A to={m.path}>{m.name} {m.fileName}</A>
            {i === 0 ? ' and the ' : ''}
          </span>
        ))}{' '}
        that you upload, with commission, taxes and swap in each trade&apos;s fees and no investor password. See the{' '}
        <A to="/forex-trading-journal">forex trading journal</A>, the <A to="/prop-firm-trading-journal">prop firm journal</A> and the free{' '}
        <A to="/resources/forex-market-hours">forex market hours</A> clock. Check {c.name}&apos;s own pages for its MetaTrader support.
      </P>

      <H2>If you trade Indian markets</H2>
      <P>
        TradeQut bills in rupees in India ({inr} a month) and reads the trade files of{' '}
        {BROKER_PAGES.map((b, i) => (
          <span key={b.id}>
            <A to={b.path}>{b.name}</A>
            {i < BROKER_PAGES.length - 2 ? ', ' : i === BROKER_PAGES.length - 2 ? ' and ' : ''}
          </span>
        ))}
        , estimating brokerage, STT and the other charges on each trade. See the{' '}
        <A to="/trading-journal-india">journal for Indian traders</A> and the{' '}
        <A to="/fo-trading-journal">F&amp;O journal</A>. Check {c.name}&apos;s own pages for its Indian broker support.
      </P>

      <P>
        Not sure? <A to="/signup">Start a free TradeQut journal</A>, import your own broker file and compare the result
        with what you use today. More on <A to="/pricing">TradeQut pricing</A> and{' '}
        <A to="/alternatives">other alternatives</A>:{' '}
        {COMPETITORS.filter((o) => o.id !== id).map((o, i, all) => (
          <span key={o.id}>
            <A to={`/alternatives/${o.id}`}>{o.name}</A>
            {i < all.length - 1 ? ', ' : '.'}
          </span>
        ))}
      </P>

      <Faq items={c.faq} />
      <Sources items={[{ label: c.pricingLabel ?? `${c.name} pricing page`, url: c.pricingUrl, checked: c.checked }, ...(c.extraSources ?? [])]} />
      <Disclaimer>
        TradeQut is not affiliated with {c.name}. Prices and features change; the vendor pages above are the authority.
        TradeQut is a journaling tool, not investment advice.
      </Disclaimer>
      <SignupCta />
    </ContentPageShell>
  );
}
