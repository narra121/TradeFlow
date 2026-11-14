import { ContentPageShell } from '@/components/content/ContentPageShell';
import { ANALYTICS_TABS } from '@/components/public/AnalyticsContents';
import { A, Callout, Crumbs, Disclaimer, Faq, H2, OL, P, ShortAnswer, SignupCta, Sources, Table, UL } from '@/content/components/ArticleParts';
import { BROKER_PAGES, getBrokerPage, type BrokerPage } from '@/content/brokers';
import { PLAN_LIMITS, TRIAL_DAYS, proPrice } from '@/content/product-facts';
import { getSeoPage } from '@/content/seo-pages';
import { seoPageSchema } from '@/config/seo';

const inrMonth = proPrice('INR', 'month').display;
const inrYear = proPrice('INR', 'year').display;
const importLimit = PLAN_LIMITS.find((r) => r.feature === 'Broker file imports')?.trial ?? '';

export function BrokerJournalPage({ id }: { id: BrokerPage['id'] }) {
  const b = getBrokerPage(id);
  const page = getSeoPage(b.path);
  const others = BROKER_PAGES.filter((x) => x.id !== id);

  return (
    <ContentPageShell title={page.title} description={page.description} path={page.path} jsonLd={seoPageSchema(page, [], b.faq)}>
      {page.parent && <Crumbs parent={page.parent} current={page.label} />}
      <h1 className="mb-4 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">{b.h1}</h1>
      <ShortAnswer>{b.shortAnswer}</ShortAnswer>

      <H2>Download the {b.fileName} from {b.name}</H2>
      <OL>
        {b.exportSteps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </OL>
      {b.exportNotes.map((n) => (
        <P key={n}>{n}</P>
      ))}

      <H2>What the {b.name} file contains</H2>
      <P>
        The file is a list of executions, one row per fill. These are the columns TradeQut looks for in a {b.name}{' '}
        {b.fileName}:
      </P>
      <Table
        caption={`Columns read from the ${b.name} ${b.fileName}`}
        head={['Column in the file', 'Used for']}
        rows={b.columns.map((c) => [<code key={c}>{c}</code>, columnUse(c)])}
      />
      <P>
        Two things are not in the file: the charges on each trade, and the reason you took it. TradeQut estimates the
        first and gives you fields for the second.
      </P>

      <H2>What TradeQut does with it</H2>
      <OL>
        <li>
          Leave <em>Source</em> on <em>Auto-detect</em> or pick {b.name}, then drop the file on the Import page (CSV or
          XLSX, up to 4 MB).
        </li>
        <li>Buys and sells of the same instrument are paired into trades, each with an entry, an exit and a quantity.</li>
        <li>
          Brokerage on {b.name}&apos;s plan, STT, exchange transaction charges, SEBI fee, stamp duty and GST are estimated
          for each trade at the rates in force on the trade date and saved as its fees, so P&amp;L is net. The charges are
          explained in <A to="/blog/fo-trading-charges-india">F&amp;O charges in India</A>.
        </li>
        <li>
          You review every row before saving: <em>Ready</em>, <em>Needs a fix</em> or <em>Already imported</em>. Importing
          an overlapping date range again does not create duplicates.
        </li>
      </OL>
      <Callout title="Estimates, not your contract note">
        Charges are calculated from published rates, not read from {b.name}. Your contract note is the authoritative
        figure.
      </Callout>

      {b.extraSections?.map((s) => (
        <section key={s.heading}>
          <H2>{s.heading}</H2>
          {s.paragraphs.map((p) => (
            <P key={p}>{p}</P>
          ))}
        </section>
      ))}

      <H2>What you can analyse once the trades are in</H2>
      <UL>
        {ANALYTICS_TABS.map((t) => (
          <li key={t.tab}>
            <strong>{t.tab}</strong>: {t.shows}
          </li>
        ))}
      </UL>
      <P>
        The file cannot tell you why you traded. Add a strategy, a mistake and any rule the trade broke while the day is
        fresh; the <A to="/fo-trading-journal">F&amp;O journal page</A> lists the fields worth filling for options and
        futures.
      </P>

      {b.ownTools && (
        <>
          <H2>What {b.name} already gives you</H2>
          <P>{b.ownTools}</P>
        </>
      )}

      <H2>What it costs</H2>
      <P>
        A {TRIAL_DAYS}-day free trial with every Pro feature and no card, including broker file imports (
        {importLimit.toLowerCase()}). Then Pro is {inrMonth} a month or {inrYear} a year; without Pro the journal is
        read-only, so you can still view and export your trades. See <A to="/pricing">pricing</A> and the{' '}
        <A to="/trading-journal-india">journal for Indian traders</A>.
      </P>
      <P>
        Other brokers:{' '}
        {others.map((o, i) => (
          <span key={o.id}>
            <A to={o.path}>{o.name}</A>
            {i < others.length - 1 ? ', ' : '. '}
          </span>
        ))}
        Any other broker works through a CSV or Excel file where you match the columns; see{' '}
        <A to="/blog/importing-trades-from-broker">importing trades from your broker</A>.
      </P>

      <Faq items={b.faq} />
      <Sources items={b.sources} />
      <Disclaimer>
        TradeQut is not affiliated with {b.name}. Menu names and reports change; {b.name}&apos;s own help pages are the
        reference. TradeQut is a journaling and analytics tool, not a SEBI-registered investment adviser, and nothing here
        is a recommendation to buy or sell any security.
      </Disclaimer>
      <SignupCta />
    </ContentPageShell>
  );
}

/** Plain-language use of a broker column, matched on the words in its header. */
function columnUse(column: string): string {
  const c = column.toLowerCase().replace(/[_/]/g, ' ');
  if (/isin/.test(c)) return 'Identifies the security';
  if (/status/.test(c)) return 'Rows that did not execute are skipped';
  if (/order (no|num|id)|order id/.test(c)) return 'Kept as the order reference';
  if (/trade (no|num|id)/.test(c)) return 'Identifies each execution, so a repeated row is counted once';
  if (/date|time/.test(c)) return 'Entry and exit time of the trade';
  if (/symbol|name|scrip/.test(c)) return 'The instrument traded';
  if (/exchange/.test(c)) return 'The exchange the fill was on';
  if (/segment|series/.test(c)) return 'Tells shares, futures and options apart';
  if (/type|side|buy sell/.test(c)) return 'Buy or sell';
  if (/qty|quantity/.test(c)) return 'Size of the fill';
  if (/value/.test(c)) return 'Price, as value divided by quantity';
  if (/price/.test(c)) return 'Entry or exit price';
  return 'Read with the row';
}
