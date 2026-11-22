import type { ReactNode } from 'react';
import { ContentPageShell } from '@/components/content/ContentPageShell';
import { A, Crumbs, Disclaimer, Faq, H2, P, ShortAnswer, SignupCta, Sources, UL, type Source } from '@/content/components/ArticleParts';
import { COMPETITORS, checkedOn } from '@/content/alternatives';
import {
  JOURNAL_PRICING,
  TRADEQUT_PRICING,
  money,
  yearlyText,
  type JournalPlan,
  type JournalPricing,
} from '@/content/journal-pricing';
import { IMPORT_SOURCES, PRICING_NOTE, TRIAL_DAYS, proPrice, type FaqItem } from '@/content/product-facts';
import { getSeoPage } from '@/content/seo-pages';
import { seoPageSchema } from '@/config/seo';

const usdMonth = proPrice('USD', 'month').display;
const usdYear = proPrice('USD', 'year').display;
const inrMonth = proPrice('INR', 'month').display;
const inrYear = proPrice('INR', 'year').display;

const andList = (items: string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const isFreeNamed = (pl: JournalPlan) => pl.monthly === 0 && /free/i.test(pl.name);

const readDays = [...new Set(JOURNAL_PRICING.map((p) => p.checked))].sort();
const readOn = readDays.length === 1 ? checkedOn(readDays[0]) : `${checkedOn(readDays[0])} to ${checkedOn(readDays[readDays.length - 1])}`;

function paidMonthly(currency: JournalPricing['currency']) {
  return JOURNAL_PRICING.filter((p) => p.currency === currency)
    .flatMap((p) => p.plans.filter((pl) => (pl.monthly ?? 0) > 0).map((pl) => ({ p, pl, amount: pl.monthly! })))
    .sort((a, b) => a.amount - b.amount);
}
const usdPaid = paidMonthly('USD');
const inrPaid = paidMonthly('INR');
const usdPaidProducts = new Set(usdPaid.map((x) => x.p.id)).size;
const inrNames = [...new Set(inrPaid.map((x) => x.p.name))];
const freeNames = JOURNAL_PRICING.filter((p) => p.hasFreePlan).map((p) => p.name);
const promoted = JOURNAL_PRICING.filter((p) => p.promotions.length > 0);
const withCurrencyNote = JOURNAL_PRICING.filter((p) => p.currencyNote);

const priced = (x: { p: JournalPricing; pl: JournalPlan; amount: number }) => `${money(x.p.currency, x.amount)} a month (${x.p.name} ${x.pl.name})`;

/** "$35 a month or $315 a year ($26 a month)", in words, for running text. */
function planWords(p: JournalPricing, pl: JournalPlan): string {
  if (pl.monthly === 0) return 'free';
  const yearly = yearlyText(p, pl);
  if (pl.monthly === null) return yearly;
  const stated = pl.yearlyTotal !== undefined || pl.yearlyPerMonth !== undefined;
  return `${money(p.currency, pl.monthly)} a month${stated ? ` or ${yearly}` : pl.yearlyNote ? ` (yearly: ${lowerFirst(pl.yearlyNote)})` : ''}`;
}

const HEADINGS: Record<string, string> = {
  tradezella: 'How much does TradeZella cost per month?',
  tradervue: 'Is Tradervue free?',
  edgewonk: 'What does Edgewonk cost?',
  tradersync: 'TraderSync pricing',
  myfxbook: 'Is Myfxbook free?',
  fxblue: 'Is FX Blue free?',
};

const sourcesOf = (p: JournalPricing): Source[] => [{ label: p.pricingLabel, url: p.pricingUrl, checked: p.checked }, ...p.extraSources];
const shortUrl = (url: string) => {
  const u = new URL(url);
  return `${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/$/, '')}`;
};

const FAQ: FaqItem[] = [
  {
    question: 'Which trading journals have a free plan?',
    answer: `Of the journals on this page, ${andList(freeNames)} have a free plan or are free, on their own pages read on ${readOn}. ${JOURNAL_PRICING.filter((p) => p.hasFreePlan)
      .map((p) => `${p.name}: ${lowerFirst(p.freeShort)}.`)
      .join(' ')} TradeQut has no free plan: it starts with a ${TRIAL_DAYS}-day free trial, then Pro.`,
  },
  {
    question: 'Are these Black Friday prices?',
    answer: `No. The table shows list prices. On ${readOn}, ${andList(promoted.map((p) => p.name))} showed promotions, which are listed under each product with the date seen; promotional prices are not used in the table or in any comparison here.`,
  },
  {
    question: `Why ${inrNames.length > 1 ? 'are some prices' : `is ${andList(inrNames)}`} shown in rupees?`,
    answer: `${andList(inrNames)} showed ${inrNames.length > 1 ? 'their' : 'its'} prices in Indian rupees when the page was read from India, and no US-dollar price list was shown. The other vendors' pages showed US dollars. No price on this page is converted between currencies.`,
  },
  {
    question: 'How much does TradeQut cost?',
    answer: `TradeQut Pro is ${usdMonth} a month or ${usdYear} a year, or ${inrMonth} a month or ${inrYear} a year in India, after a ${TRIAL_DAYS}-day free trial with every Pro feature and no card. ${PRICING_NOTE.split('. ')[0]}.`,
  },
  {
    question: 'How were these prices checked?',
    answer: `Each price was read on ${readOn} from the vendor's own pricing page, in a browser, with both the monthly and the yearly view where the page has a switch. Review sites were not used as a source. Prices, plans and offers change, so check the vendor's page before you buy.`,
  },
];

function CellLabel({ children }: { children: ReactNode }) {
  return <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground md:hidden">{children}</span>;
}

const CELL = 'px-3 py-2 align-top max-md:block max-md:px-0 max-md:py-1';

function VendorRow({ p }: { p: JournalPricing }) {
  return (
    <tr className="border-t border-border/50 max-md:block max-md:px-3 max-md:py-3">
      <th scope="row" className={`${CELL} text-left font-semibold text-foreground max-md:text-base`}>
        {p.name}
        <span className="block text-xs font-normal text-muted-foreground">{p.currency === 'USD' ? 'US dollars' : 'Indian rupees'}</span>
      </th>
      <td className={`${CELL} text-muted-foreground`}>
        <CellLabel>Plans and list prices</CellLabel>
        <ul className="space-y-2">
          {p.plans.map((pl) => (
            <li key={pl.name}>
              <span className="font-medium text-foreground">{pl.name}</span>
              {isFreeNamed(pl) ? '' : `: ${pl.monthly === 0 ? 'free' : pl.monthly === null ? yearlyText(p, pl) : `${money(p.currency, pl.monthly)} a month`}`}
              {pl.monthly !== null && pl.monthly > 0 && <span className="block">Yearly: {lowerFirst(yearlyText(p, pl))}</span>}
            </li>
          ))}
        </ul>
      </td>
      <td className={`${CELL} text-muted-foreground`}>
        <CellLabel>Free plan or trial</CellLabel>
        {p.freeShort}
      </td>
      <td className={`${CELL} text-muted-foreground [overflow-wrap:anywhere]`}>
        <CellLabel>Vendor page</CellLabel>
        {sourcesOf(p).map((s) => (
          <span key={s.url} className="block">
            <A to={s.url}>{shortUrl(s.url)}</A>
          </span>
        ))}
        <span className="mt-1 block text-xs">Prices read on {checkedOn(p.checked)}; check the vendor&apos;s page.</span>
      </td>
    </tr>
  );
}

function TradeQutRow() {
  return (
    <tr className="border-t border-border/50 max-md:block max-md:px-3 max-md:py-3">
      <th scope="row" className={`${CELL} text-left font-semibold text-foreground max-md:text-base`}>
        {TRADEQUT_PRICING.name}
        <span className="block text-xs font-normal text-muted-foreground">US dollars or Indian rupees</span>
      </th>
      <td className={`${CELL} text-muted-foreground`}>
        <CellLabel>Plans and list prices</CellLabel>
        <span className="font-medium text-foreground">{TRADEQUT_PRICING.plan}</span>: {usdMonth} a month ({inrMonth} in India)
        <span className="block">
          Yearly: {usdYear} a year ({inrYear} in India)
        </span>
      </td>
      <td className={`${CELL} text-muted-foreground`}>
        <CellLabel>Free plan or trial</CellLabel>
        {TRADEQUT_PRICING.freeShort}
      </td>
      <td className={`${CELL} text-muted-foreground`}>
        <CellLabel>Vendor page</CellLabel>
        <A to="/pricing">TradeQut pricing</A>
        <span className="mt-1 block text-xs">The journal this site belongs to.</span>
      </td>
    </tr>
  );
}

function ProductSection({ p }: { p: JournalPricing }) {
  const alt = COMPETITORS.find((c) => c.id === p.alternative);
  return (
    <section aria-labelledby={`cost-${p.id}`}>
      <h3 id={`cost-${p.id}`} className="text-base font-semibold text-foreground mt-6 mb-3 scroll-mt-24">
        {HEADINGS[p.id] ?? `${p.name} pricing`}
      </h3>
      <P>List prices on {p.name}&apos;s own pages, read on {checkedOn(p.checked)}:</P>
      <UL>
        {p.plans.map((pl) => (
          <li key={pl.name}>{isFreeNamed(pl) ? `${pl.name} plan` : `${pl.name}: ${planWords(p, pl)}`}</li>
        ))}
      </UL>
      <P>
        {p.freeOrTrial} {p.limits}
      </P>
      {p.promotions.map((promo) => (
        <P key={promo.text}>
          Promotion seen on {checkedOn(promo.seen)}, not used as the price here: {promo.text}
        </P>
      ))}
      {p.notStated.length > 0 && <P>Not stated on the vendor&apos;s page: {andList(p.notStated)}.</P>}
      <P>
        Source: <A to={p.pricingUrl}>{p.pricingLabel}</A>, read on {checkedOn(p.checked)}; check it before you buy.
        {alt && (
          <>
            {' '}
            Import method, markets and where {p.name} is stronger: <A to={`/alternatives/${alt.id}`}>{p.name} compared with TradeQut</A>.
          </>
        )}
      </P>
    </section>
  );
}

const ALL_SOURCES: Source[] = JOURNAL_PRICING.flatMap((p) => [
  ...sourcesOf(p),
  ...p.promotions.map((x) => ({ label: `${p.name} offer`, url: x.url, checked: x.seen })),
]).filter((s, i, all) => all.findIndex((x) => x.url === s.url) === i);

export default function JournalPricingPage() {
  const page = getSeoPage('/trading-journal-pricing');
  const low = usdPaid[0];
  const high = usdPaid[usdPaid.length - 1];
  return (
    <ContentPageShell
      title={page.title}
      description={page.description}
      path={page.path}
      jsonLd={seoPageSchema(page, [], FAQ)}
      type="article"
      publishedTime={page.publishedAt}
      modifiedTime={page.updatedAt}
      maxWidth="max-w-4xl"
    >
      {page.parent && <Crumbs parent={page.parent} current={page.label} />}
      <h1 className="mb-4 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">Trading journal pricing compared</h1>
      <ShortAnswer>
        On list prices read on {readOn}, the paid monthly plans of the {usdPaidProducts} journals here priced in US dollars run
        from {priced(low)} to {priced(high)}.{' '}
        {inrPaid.length > 0 &&
          `Priced in rupees, ${andList(inrNames)} lists ${money('INR', inrPaid[0].amount)} to ${money('INR', inrPaid[inrPaid.length - 1].amount)} a month. `}
        {andList(freeNames)} have a free plan or are free. TradeQut Pro is {usdMonth} a month or {usdYear} a year ({inrMonth} or{' '}
        {inrYear} in India) after a {TRIAL_DAYS}-day free trial.
      </ShortAnswer>

      <H2 id="table">Plans and list prices side by side</H2>
      <P>
        Every price below was read from the vendor&apos;s own pricing page on {readOn}; check the vendor&apos;s page before you
        buy. The table shows list prices; promotions are listed under each product further down. Products are in
        alphabetical order, with TradeQut last.
      </P>
      <div className="mb-6 rounded-lg border border-border/60">
        <table className="w-full text-sm max-md:block">
          <caption className="sr-only">Trading journal plans and list prices, read on {readOn}</caption>
          <thead className="bg-muted/40 max-md:sr-only">
            <tr>
              <th scope="col" className="w-[15%] px-3 py-2 text-left align-bottom font-semibold text-foreground">
                Product
              </th>
              <th scope="col" className="w-[38%] px-3 py-2 text-left align-bottom font-semibold text-foreground">
                Plans and list prices
              </th>
              <th scope="col" className="w-[22%] px-3 py-2 text-left align-bottom font-semibold text-foreground">
                Free plan or trial
              </th>
              <th scope="col" className="w-1/4 px-3 py-2 text-left align-bottom font-semibold text-foreground">
                Vendor page and date read
              </th>
            </tr>
          </thead>
          <tbody className="max-md:block">
            {JOURNAL_PRICING.map((p) => (
              <VendorRow key={p.id} p={p} />
            ))}
            <TradeQutRow />
          </tbody>
        </table>
      </div>

      <H2 id="each">What each journal costs</H2>
      {JOURNAL_PRICING.map((p) => (
        <ProductSection key={p.id} p={p} />
      ))}

      <H2 id="not-in-the-price">What the price does not tell you</H2>
      <UL>
        <li>
          How trades arrive: by automatic broker sync or by a file you upload. TradeQut imports files from{' '}
          {andList(IMPORT_SOURCES.filter((s) => s.id !== 'generic_csv').map((s) => s.name))} and any broker through a generic
          CSV, and reads screenshots with AI extraction; automatic broker sync is planned, not available.
        </li>
        <li>Limits per plan, such as trading accounts or trades a month, which are listed under each product above.</li>
        <li>Which markets the plan you pick covers: forex, futures, options or Indian brokers. Check the vendor&apos;s page for yours.</li>
        <li>
          Currency, tax and regional prices. These pages were read from India; visitors elsewhere may see other currencies or
          prices.{' '}
          {withCurrencyNote.map((p) => (
            <span key={p.id}>
              {p.name}: {p.currencyNote}{' '}
            </span>
          ))}
        </li>
        <li>What a yearly plan renews at after a first-year offer, where the vendor&apos;s page does not say.</li>
      </UL>
      <P>
        Features, import method and where each product is stronger are compared one at a time:{' '}
        {COMPETITORS.map((c, i) => (
          <span key={c.id}>
            <A to={`/alternatives/${c.id}`}>{c.name}</A>
            {i < COMPETITORS.length - 2 ? ', ' : i === COMPETITORS.length - 2 ? ' and ' : '.'}
          </span>
        ))}{' '}
        All of them are on the <A to="/alternatives">alternatives</A> page.
      </P>

      <H2 id="currency">Prices in rupees and dollars</H2>
      <P>
        {PRICING_NOTE} TradeQut Pro is {inrMonth} a month or {inrYear} a year in India and {usdMonth} or {usdYear} elsewhere.
      </P>
      <P>
        The other vendors&apos; pages showed US dollars, except {andList(inrNames)}, which showed Indian rupees. No price here
        is converted between currencies.{' '}
        {inrPaid.length > 0 &&
          `In rupees, on list prices read on ${readOn}, ${inrPaid.map((x) => `${x.p.name} ${x.pl.name} is ${money('INR', x.amount)} a month`).join(' and ')}; TradeQut Pro is ${inrMonth}.`}
      </P>
      <P>
        Trading forex? See the <A to="/forex-trading-journal">forex trading journal</A>. In India, see the{' '}
        <A to="/trading-journal-india">journal for Indian traders</A>. Full TradeQut plan details are on the{' '}
        <A to="/pricing">pricing page</A>.
      </P>

      <Faq items={FAQ} />
      <Sources items={ALL_SOURCES} />
      <Disclaimer>
        TradeQut is not affiliated with the products compared. This page compares list prices only and makes no statement
        about the quality of any product. Prices, plans and offers change; the vendor pages above are the authority.
        TradeQut is a journaling tool, not investment advice.
      </Disclaimer>
      <SignupCta />
    </ContentPageShell>
  );
}
