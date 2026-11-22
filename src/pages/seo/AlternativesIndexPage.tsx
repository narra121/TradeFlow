import { Link } from 'react-router-dom';
import { ContentPageShell } from '@/components/content/ContentPageShell';
import { A, Disclaimer, H2, P, ShortAnswer } from '@/content/components/ArticleParts';
import { COMPETITORS, checkedOn } from '@/content/alternatives';
import { TRIAL_DAYS, proPrice } from '@/content/product-facts';
import { getSeoPage } from '@/content/seo-pages';
import { seoPageSchema } from '@/config/seo';

const usdMonth = proPrice('USD', 'month').display;
const inrMonth = proPrice('INR', 'month').display;

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
        {COMPETITORS.length} widely used trading journals compared with TradeQut, using prices and features read from the
        vendors&apos; own pages. Each page gives the date the vendor page was read, says where the other product is stronger
        and states what we could not verify.
      </ShortAnswer>

      <H2>Comparisons</H2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {COMPETITORS.map((c) => (
          <li key={c.id} className="panel p-4">
            <h3 className="font-semibold text-foreground">
              <Link to={`/alternatives/${c.id}`} className="hover:underline">
                {c.name} alternative
              </Link>
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">{c.summary}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Paid price: {c.table.price}. Checked {checkedOn(c.checked)}.
            </p>
          </li>
        ))}
      </ul>
      <P>
        Every plan and list price in one table, with the date each vendor page was read:{' '}
        <A to="/trading-journal-pricing">trading journal pricing compared</A>.
      </P>

      <H2>Where TradeQut sits</H2>
      <P>
        TradeQut is the smaller and newer product in every comparison here. It has one plan: a {TRIAL_DAYS}-day free trial
        with every feature and no card, then Pro at {usdMonth} a month ({inrMonth} in India). Trades come in through MetaTrader
        4/5 reports, Indian broker files, a generic CSV or <A to="/import-trades-from-screenshot">screenshots</A>; automatic broker sync is planned, not
        available. Its focus is the cost of your own habits: what each mistake and broken rule cost, net of charges.
      </P>
      <P>
        If you trade forex, start with the <A to="/forex-trading-journal">forex trading journal</A> (MT4 and MT5 report import) or the{' '}
        <A to="/prop-firm-trading-journal">prop firm journal</A>; for Indian markets, the <A to="/trading-journal-india">journal for Indian traders</A>{' '}
        or the <A to="/fo-trading-journal">F&amp;O journal</A>. Full plan details are on the <A to="/pricing">pricing page</A>.
      </P>

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
