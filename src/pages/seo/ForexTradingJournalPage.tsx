import { ContentPageShell } from '@/components/content/ContentPageShell';
import { A, Disclaimer, Faq, H2, OL, P, ShortAnswer, SignupCta, Sources, Table, UL } from '@/content/components/ArticleParts';
import { METATRADER_PAGES } from '@/content/forex-platforms';
import { PLAN_LIMITS, PRODUCT_DEFINITION, TRIAL_DAYS, proPrice, type FaqItem } from '@/content/product-facts';
import { getSeoPage } from '@/content/seo-pages';
import { seoPageSchema } from '@/config/seo';

const usdMonth = proPrice('USD', 'month').display;
const usdYear = proPrice('USD', 'year').display;
const inrMonth = proPrice('INR', 'month').display;
const trialImports = PLAN_LIMITS.find((r) => r.feature === 'Broker file imports')?.trial ?? '';

const FAQ: FaqItem[] = [
  {
    question: 'What is the best way to keep a forex trading journal?',
    answer:
      'Record every trade with the pair, direction, lots, entry, exit, stop and target, the commission and swap, the session and the setup, plus any mistake and one line on why you took it. Importing the platform\'s report saves the typing and the errors; the why is the part you add. Review once a week by pair, session and setup.',
  },
  {
    question: 'Can TradeQut import my MT4 or MT5 history?',
    answer:
      'Yes. Upload the MetaTrader 4 Detailed Report (HTML) or the MetaTrader 5 history report (HTML or Excel). TradeQut reads each closed trade with its lots, prices, stop and target, and adds commission, taxes and swap to the fees, so P&L is net.',
  },
  {
    question: 'Does TradeQut connect to my broker or need my investor password?',
    answer: 'No. You upload the report yourself; there is no Expert Advisor, investor password or broker login. Automatic sync is planned, not available.',
  },
  {
    question: 'Does it show my results by session?',
    answer:
      'Yes, by the session you tag on each trade (Asian, London Open, NY Open, London/NY Overlap and others; bulk edit tags many at once). Results by hour of day and weekday come from each trade\'s open time in your time zone. The session tag is not set automatically from the time.',
  },
  {
    question: 'Does TradeQut show P&L in pips?',
    answer:
      'No. Trades keep their size in lots and their P&L in the account currency, net of commission and swap. The free pip value calculator converts pips to money for any pair and lot size.',
  },
  {
    question: 'Can I keep accounts in different currencies?',
    answer:
      'Yes. Each trading account has its own currency, and its P&L is shown in it. When you look at all accounts together, amounts in different currencies are kept apart, never added up.',
  },
  {
    question: 'Is TradeQut free for forex traders?',
    answer: `Every account starts with a ${TRIAL_DAYS}-day free trial with every Pro feature and no card. After that Pro is ${usdMonth} a month or ${usdYear} a year (${inrMonth} a month in India). Without Pro the journal is read-only: you can still view and export your trades.`,
  },
  {
    question: 'Does TradeQut give forex signals?',
    answer: 'No. It analyses your own past trades and never recommends a pair, a direction or a trade.',
  },
];

export default function ForexTradingJournalPage() {
  const page = getSeoPage('/forex-trading-journal');
  return (
    <ContentPageShell title={page.title} description={page.description} path={page.path} jsonLd={seoPageSchema(page, [], FAQ)}>
      <h1 className="mb-4 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">
        Forex trading journal: MT4 and MT5 import, sessions and prop accounts
      </h1>
      <ShortAnswer>
        Upload your MetaTrader 4 or 5 report and TradeQut records every closed trade with its lots, stop and target, and commission and swap in the fees.
        Tag the session and setup, mark the rules you broke, and see which pairs, sessions, hours and habits make or lose money. No investor password or
        EA. {TRIAL_DAYS}-day free trial, then {usdMonth} a month.
      </ShortAnswer>
      <P>{PRODUCT_DEFINITION}</P>

      <H2>Import your MetaTrader history</H2>
      <P>
        Save the report from the terminal, drop it on the Import page, review the rows and save. Each platform has a page with the export steps and every
        column TradeQut reads:
      </P>
      <UL>
        {METATRADER_PAGES.map((m) => (
          <li key={m.id}>
            <A to={m.path}>{m.short} trading journal</A>: import the {m.name} {m.fileName} ({m.fileTypes})
          </li>
        ))}
      </UL>
      <P>
        Not saved a report before? <A to="/blog/mt5-trading-journal">How to export MT5 trade history for a journal</A> walks through it and what to check
        in the file.
      </P>
      <P>
        Other platforms, such as cTrader, have no dedicated importer: export the trade history as CSV or Excel and match the columns, including the profit
        column (see <A to="/blog/importing-trades-from-broker">importing trades from your broker</A>). When a broker or prop firm offers no export at all,{' '}
        <A to="/import-trades-from-screenshot">import trades from a screenshot</A> of the trade list and check each row before saving.
      </P>

      <H2>What a forex journal should record</H2>
      <Table
        caption="Fields for a forex trade, and where they come from in TradeQut"
        head={['Field', 'Why it matters', 'From the report?']}
        rows={[
          ['Pair, direction, lots', 'Results by pair and size; oversized trades stand out', 'Yes'],
          ['Entry, exit, stop, target', 'R multiple of each trade, planned against captured R, losses past the stop', 'Yes (S/L and T/P when set)'],
          ['Commission, taxes, swap', 'Net P&L; a strategy can be positive before costs and negative after', 'Yes, added to the fees'],
          ['Session', 'London, New York and Asian hours behave differently for most pairs', 'No: you tag it, one trade or many at once'],
          ['Setup', 'Which strategy carries the edge', 'No: you add it'],
          ['Mistakes and broken rules', 'What each habit costs in money and R', 'No: you mark them'],
          ['News event, market condition, notes, chart', 'Context for the weekly review', 'No: you add them'],
        ]}
      />
      <P>
        More on the fields, with examples, in <A to="/blog/forex-trading-journal">what forex traders should track</A>. Sessions move with daylight saving;
        the <A to="/resources/forex-market-hours">forex market hours clock</A> shows them in your time zone for any date. A scenario with made-up data shows{' '}
        <A to="/case-studies/forex-session-edge">comparing forex sessions with hourly analytics</A>.
      </P>

      <H2>What you see once the trades are in</H2>
      <OL>
        <li>
          Results by pair, session tag, setup, direction, hour of day, weekday and the weekday-by-hour grid, each with the number of trades behind it and,
          from 20 trades, a range, so a pattern from a handful of trades is not shown as an edge.
        </li>
        <li>
          Risk: R multiples from your stops, losses that ran past the stop, planned against captured R, drawdown, and the cost of trades taken after a loss.
        </li>
        <li>
          A what-if replay: your results without one session, without the trades after a chosen time of day, or with at most a set number of trades a day.
        </li>
        <li>A P&amp;L calendar by day, week and month, and one journal across accounts, each in its own currency.</li>
      </OL>

      <H2>Free forex tools</H2>
      <UL>
        <li>
          <A to="/resources/forex-market-hours">Forex market hours</A>: Sydney, Tokyo, London and New York in your time zone, with this year&apos;s
          daylight-saving changes.
        </li>
        <li>
          <A to="/resources/position-size">Position size</A> and <A to="/resources/pip-calculator">pip value</A>: lots from risk and stop, for currency
          pairs and gold (XAU/USD).
        </li>
        <li>
          <A to="/resources/margin-calculator">Margin and leverage</A>: the margin a position ties up, in your account currency.
        </li>
        <li>
          <A to="/resources/prop-firm-drawdown-calculator">Prop firm drawdown</A>: room left under daily and maximum loss limits, static or trailing.
        </li>
        <li>
          <A to="/resources/risk-of-ruin-calculator">Risk of ruin</A>, <A to="/resources/expectancy-calculator">expectancy</A> and{' '}
          <A to="/resources/compounding-calculator">compounding</A>: what a win rate, payoff and risk per trade add up to.
        </li>
      </UL>

      <H2>Prop firm challenges</H2>
      <P>
        Mark an account as a prop challenge or a funded account and set its status (active, breached, passed). Write the firm&apos;s limits as rules and mark
        the trades that broke them; Analytics shows what the breaks cost. TradeQut does not read live equity or warn you before a limit; the{' '}
        <A to="/prop-firm-trading-journal">prop firm trading journal</A> page explains what it does and does not track.
      </P>

      <H2>How it compares</H2>
      <P>
        Myfxbook and FX Blue are free and connect to MetaTrader automatically, but are statistics and track-record sites; TradeZella, TradesViz and
        Edgewonk sync MetaTrader accounts and cost more; TraderSync lists forex on every plan from $29.95 a month. Each comparison gives the date the vendor
        pages were read and where that product is stronger: <A to="/alternatives/myfxbook">Myfxbook</A>, <A to="/alternatives/fxblue">FX Blue</A>,{' '}
        <A to="/alternatives/tradersync">TraderSync</A>, <A to="/alternatives/tradezella">TradeZella</A>, <A to="/alternatives/tradesviz">TradesViz</A>{' '}
        and <A to="/alternatives/edgewonk">Edgewonk</A>.
      </P>

      <H2>What TradeQut does not do</H2>
      <UL>
        <li>It does not connect to your broker: there is no EA and no investor password. You upload reports; automatic sync is planned, not available.</li>
        <li>It has no importer for cTrader, TradingView or other forex platforms besides MT4 and MT5; use a CSV or screenshots.</li>
        <li>It does not show P&amp;L in pips, and it does not fill in the session from the trade time.</li>
        <li>It does not track a prop firm&apos;s live equity or limits.</li>
        <li>It gives no signals and has no native mobile app; it is a web app that works in desktop and mobile browsers.</li>
      </UL>

      <H2>What it costs</H2>
      <P>
        A {TRIAL_DAYS}-day free trial with every Pro feature and no card, including file imports ({trialImports.toLowerCase()}). Then Pro: {usdMonth} a month
        or {usdYear} a year, billed in US dollars outside India and in rupees in India ({inrMonth} a month). Without Pro the journal is read-only. See{' '}
        <A to="/pricing">pricing</A>. Trading Indian markets as well? The same journal reads Zerodha, Dhan, Upstox, Angel One and Groww files: see the{' '}
        <A to="/trading-journal-india">journal for Indian traders</A>.
      </P>

      <Faq items={FAQ} />
      <Sources
        items={[
          { label: 'MetaTrader 4 Help: Account History', url: 'https://www.metatrader4.com/en/trading-platform/help/overview/terminal/terminal_account_history', checked: '2026-11-15' },
          { label: 'MetaTrader 5 Help: Trading Report', url: 'https://www.metatrader5.com/en/terminal/help/trading_advanced/history_report', checked: '2026-11-15' },
        ]}
      />
      <Disclaimer>
        TradeQut is not affiliated with MetaQuotes, any broker or any prop firm. TradeQut is a journaling and analytics tool, not an investment adviser, and
        nothing here is a recommendation to buy or sell any currency or security.
      </Disclaimer>
      <SignupCta />
    </ContentPageShell>
  );
}
