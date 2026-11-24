import { ContentPageShell } from '@/components/content/ContentPageShell';
import { ANALYTICS_TABS } from '@/components/public/AnalyticsContents';
import { A, Callout, Crumbs, Disclaimer, Faq, H2, OL, P, ShortAnswer, SignupCta, Sources, Table, UL } from '@/content/components/ArticleParts';
import { METATRADER_PAGES, getMetaTraderPage, type MetaTraderPage } from '@/content/forex-platforms';
import { PLAN_LIMITS, TRIAL_DAYS, VIDEO_LINKS, proPrice } from '@/content/product-facts';
import { getSeoPage } from '@/content/seo-pages';
import { seoPageSchema } from '@/config/seo';

const usdMonth = proPrice('USD', 'month').display;
const usdYear = proPrice('USD', 'year').display;
const inrMonth = proPrice('INR', 'month').display;
const importLimit = PLAN_LIMITS.find((r) => r.feature === 'Broker file imports')?.trial ?? '';

export function MetaTraderJournalPage({ id }: { id: MetaTraderPage['id'] }) {
  const m = getMetaTraderPage(id);
  const page = getSeoPage(m.path);
  const other = METATRADER_PAGES.find((x) => x.id !== id)!;

  return (
    <ContentPageShell title={page.title} description={page.description} path={page.path} jsonLd={seoPageSchema(page, [], m.faq)}>
      {page.parent && <Crumbs parent={page.parent} current={page.label} />}
      <h1 className="mb-4 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">{m.h1}</h1>
      <ShortAnswer>{m.shortAnswer}</ShortAnswer>

      <H2>Save the {m.fileName} from {m.name}</H2>
      <OL>
        {m.exportSteps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </OL>
      {m.exportNotes.map((n) => (
        <P key={n}>{n}</P>
      ))}
      {m.id === 'mt5' && (
        <P>
          What to check in the file before you import it (server time, commission and swap, partial closes) is covered in{' '}
          <A to="/blog/mt5-trading-journal">how to export MT5 trade history for a journal</A>. <A to={VIDEO_LINKS.mt5Import}>A 28-second video</A> shows
          the import.
        </P>
      )}
      <SignupCta />

      <H2>What TradeQut reads from the report</H2>
      <P>
        The file is {m.fileTypes}, up to 4 MB. These are the columns of the closed-trades table, in the order {m.short} writes them, and what each one
        becomes in the journal:
      </P>
      <Table
        caption={`Columns read from the ${m.name} ${m.fileName}`}
        head={['Column in the report', 'Used for']}
        rows={m.columns.map(([c, use], i) => [<code key={`${c}-${i}`}>{c}</code>, use])}
      />
      <P>
        Net P&amp;L of a trade is the report&apos;s Profit plus its commission{m.id === 'mt4' ? ', taxes' : ''} and swap, so a trade that made 20 pips
        but paid more in commission and swap than it earned shows as the loss it was. Position size stays in lots. TradeQut does not show results in pips;
        the <A to="/resources/pip-calculator">pip value calculator</A> converts between the two.
      </P>

      <H2>What happens on import</H2>
      <img
        src="/guide/import-trades.png"
        alt="TradeQut Import page with account, source, drop zone and broker export guides. Sample data."
        loading="lazy"
        decoding="async"
        width={1440}
        height={900}
        className="my-4 h-auto w-full rounded-lg border border-border"
      />
      <OL>
        <li>
          Drop the file on the Import page and choose the trading account it belongs to. TradeQut detects the {m.short} layout and lists every closed
          trade.
        </li>
        <li>
          Each symbol is cleaned of the broker&apos;s suffix and classed as forex, metal, index CFD or crypto, so EUR/USD, XAU/USD and US30 can be
          compared apart.
        </li>
        <li>
          You review every row before saving: <em>Ready</em>, <em>Needs a fix</em> or <em>Already imported</em>. Importing an overlapping period again
          does not create duplicates, because each trade keeps its {m.id === 'mt4' ? 'ticket' : 'position'} number.
        </li>
        <li>Saved trades then appear in the trade log, the P&amp;L calendar and Analytics.</li>
      </OL>
      <Callout title="Report times are broker server time">
        TradeQut reads the times in the report as UTC and shows a warning on import. If your broker&apos;s server runs at another offset, hour-of-day and
        weekday results are shifted by that much; your broker states its server time zone. The{' '}
        <A to="/resources/forex-market-hours">forex market hours clock</A> shows the sessions in any zone.
      </Callout>

      <H2>What the report cannot tell you</H2>
      <P>A MetaTrader report records what happened. A journal adds why, and that is where most of the useful analysis comes from:</P>
      <UL>
        <li>
          <strong>Setup or strategy</strong>: the reason for the trade, so results can be split by setup.
        </li>
        <li>
          <strong>Session</strong>: tag the session you traded (Asian, London Open, NY Open, London/NY Overlap and others), one trade or many at once with
          bulk edit, to see results by session. The tag is yours to set; it is not filled in from the trade time.
        </li>
        <li>
          <strong>Mistakes and broken rules</strong>: write your rules, mark the ones a trade broke, and see what the breaks cost.
        </li>
        <li>
          <strong>Notes and chart screenshots</strong>: what you saw at entry, for the weekly review.
        </li>
      </UL>

      <H2>What you can analyse once the trades are in</H2>
      <UL>
        {ANALYTICS_TABS.filter((t) => t.tab !== 'Tax').map((t) => (
          <li key={t.tab}>
            <strong>{t.tab}</strong>: {t.shows}
          </li>
        ))}
      </UL>
      <P>
        For forex the useful splits are usually by pair, session tag, hour and weekday, and by setup within the pair you trade most. Every figure shows how
        many trades it rests on, so a pattern from eight trades is not presented as an edge. The{' '}
        <A to="/forex-trading-journal">forex trading journal</A> page lists the fields worth filling for currency pairs and gold.
      </P>

      <H2>{m.short} statistics sites or a journal</H2>
      <P>
        <A to="/alternatives/myfxbook">Myfxbook</A> and <A to="/alternatives/fxblue">FX Blue</A> are free and connect to {m.short} automatically with an
        investor password or an Expert Advisor, and publish statistics and track records. TradeQut does neither: it reads the report you upload, keeps the
        journal private, and is built for the notes, setups and rules around each trade. Prop-firm traders can mark the account as a challenge or funded
        account and use the <A to="/resources/prop-firm-drawdown-calculator">drawdown calculator</A> for the firm&apos;s limits; see the{' '}
        <A to="/prop-firm-trading-journal">prop firm trading journal</A> page.
      </P>

      <H2>What it costs</H2>
      <P>
        A {TRIAL_DAYS}-day free trial with every Pro feature and no card, including file imports ({importLimit.toLowerCase()}). Then Pro is {usdMonth} a
        month or {usdYear} a year ({inrMonth} a month in India); without Pro the journal is read-only, so you can still view and export your trades. See{' '}
        <A to="/pricing">pricing</A>.
      </P>
      <P>
        Using {other.short} as well? See the <A to={other.path}>{other.short} trading journal</A>. A broker without MetaTrader works through a CSV or
        Excel file where you match the columns (<A to="/blog/importing-trades-from-broker">importing trades from your broker</A>), and a platform with no
        export at all through <A to="/import-trades-from-screenshot">screenshots of the trade list</A>.
      </P>

      <Faq items={m.faq} />
      <Sources items={m.sources} />
      <Disclaimer>
        TradeQut is not affiliated with MetaQuotes or any broker. Menu names change between {m.short} builds and brokers; the platform&apos;s own help is
        the reference. TradeQut is a journaling and analytics tool, not an investment adviser, and nothing here is a recommendation to buy or sell any
        currency or security.
      </Disclaimer>
      <SignupCta />
    </ContentPageShell>
  );
}
