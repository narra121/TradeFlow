import { ContentPageShell } from '@/components/content/ContentPageShell';
import { A, Callout, Crumbs, Disclaimer, Faq, H2, OL, P, ShortAnswer, SignupCta, Sources, Table, UL } from '@/content/components/ArticleParts';
import { TRIAL_DAYS, proPrice, type FaqItem } from '@/content/product-facts';
import { getSeoPage } from '@/content/seo-pages';
import { seoPageSchema } from '@/config/seo';

const usdMonth = proPrice('USD', 'month').display;
const usdYear = proPrice('USD', 'year').display;

const FAQ: FaqItem[] = [
  {
    question: 'What should a prop firm trading journal track?',
    answer:
      'Every trade with its size, stop and risk in money, the day\'s running result against the daily loss limit, the account against its overall limit, and the setup and any rule you broke. Most failed challenges end on one bad day or one oversized trade, so the journal has to show which habits lead there.',
  },
  {
    question: 'Does TradeQut track my prop firm\'s daily loss and drawdown limits?',
    answer:
      'Not automatically. TradeQut does not read your live equity and does not warn you before a limit. You write the firm\'s limits as rules, mark the trades that broke them and see what the breaks cost; Analytics shows the current and deepest drawdown of your closed trades. For today\'s room under both limits use the free prop firm drawdown calculator.',
  },
  {
    question: 'Can I keep several challenge and funded accounts apart?',
    answer:
      'Yes. Each account has a type (prop challenge, funded, personal or demo), a status (active, breached, passed, withdrawn or inactive), a currency and its own trades. You can view one account, a few, or all of them together.',
  },
  {
    question: 'How do I get my challenge trades into TradeQut?',
    answer:
      'If the firm gives you MetaTrader 4 or 5, save the account history report and upload it. If it offers only a web dashboard, upload screenshots of the trade list; AI extraction reads the trades and you check each row before saving. Any CSV or Excel export works through column matching.',
  },
  {
    question: 'Does TradeQut connect to my prop firm account?',
    answer: 'No. You upload reports or screenshots; there is no investor password, EA or firm integration. Automatic sync is planned, not available.',
  },
  {
    question: 'What does it cost for a prop trader?',
    answer: `A ${TRIAL_DAYS}-day free trial with every Pro feature and no card, then ${usdMonth} a month or ${usdYear} a year for every account you add.`,
  },
];

export default function PropFirmTradingJournalPage() {
  const page = getSeoPage('/prop-firm-trading-journal');
  return (
    <ContentPageShell title={page.title} description={page.description} path={page.path} jsonLd={seoPageSchema(page, [], FAQ)}>
      {page.parent && <Crumbs parent={page.parent} current={page.label} />}
      <h1 className="mb-4 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">
        Prop firm trading journal: challenges, funded accounts and the rules you break
      </h1>
      <ShortAnswer>
        Keep each challenge and funded account apart with its status, import the MT4 or MT5 report or screenshots of the trade list, write the firm&apos;s
        limits as your rules and see which habits cost money. TradeQut does not track your live equity or warn you before a limit; the free{' '}
        <A to="/resources/prop-firm-drawdown-calculator">drawdown calculator</A> works out today&apos;s room.
      </ShortAnswer>

      <H2>Why challenges fail, and what a journal can show</H2>
      <P>
        A challenge has a profit target and two ways to lose: a daily loss limit and an overall maximum loss, static or trailing. The limits are known in
        advance, so the failures are rarely about the strategy. They come from a size that was too big for the room left, a revenge trade after a loss, or
        trading on after the day was already bad. Those are habits, and a journal is how you see them:
      </P>
      <UL>
        <li>Trades opened within minutes of a loss, and their result against your other trades.</li>
        <li>Trades that risked more than your usual size, and losses that ran past the stop.</li>
        <li>The trade number in the day at which your results turn negative.</li>
        <li>Each rule you wrote, how often you broke it, and what the breaks cost.</li>
      </UL>

      <H2>Set up a challenge in TradeQut</H2>
      <OL>
        <li>
          Add an account for the challenge: type <em>Prop challenge</em> (or <em>Funded</em> once you pass), its currency and starting balance. Later set the
          status to <em>Passed</em>, <em>Breached</em> or <em>Withdrawn</em>.
        </li>
        <li>
          Write the firm&apos;s limits and your own rules as rules, for example &quot;Stop for the day at a 3% loss&quot; or &quot;No new trade within 15
          minutes of a loss&quot;.
        </li>
        <li>
          Import the trades: the <A to="/mt5-trading-journal">MT5 report</A> or <A to="/mt4-trading-journal">MT4 report</A> from the firm&apos;s terminal (<A to="/blog/mt5-trading-journal">how to export it</A>),
          or <A to="/import-trades-from-screenshot">screenshots</A> when the firm offers no export. Re-importing an overlapping period does not duplicate
          trades.
        </li>
        <li>Each day, tag the setup and session and mark any rule a trade broke. Analytics then shows what each habit costs.</li>
      </OL>

      <H2>Calculate the room under the limits</H2>
      <P>
        Firms measure limits differently: the daily limit as a share of the starting balance or of the day&apos;s opening balance, the day reset at a fixed
        clock time, open trades counted or not, and the overall limit static or trailing. The{' '}
        <A to="/resources/prop-firm-drawdown-calculator">prop firm drawdown calculator</A> takes each of those choices and gives the room left today and the
        lot size that fits at your stop. FTMO, for example, describes on its Trading Objectives page a 5% daily and 10% static maximum loss for the 2-Step
        challenge, and a 3% daily and 10% end-of-day trailing maximum loss for the 1-Step (read 15 November 2026).
      </P>
      <Table
        caption="Which tool answers which question"
        head={['Question', 'Where to look']}
        rows={[
          ['How much can I still lose today?', 'Prop firm drawdown calculator (or the firm\'s dashboard)'],
          ['How many lots fit my risk at this stop?', 'Position size calculator, gold included'],
          ['How likely is a run of losses to end the challenge?', 'Risk of ruin calculator, with the ruin level at the maximum loss'],
          ['Which of my habits cost the most?', 'TradeQut Analytics: Behaviour and broken rules'],
          ['Do I trade better in one session?', 'TradeQut Analytics by session tag and by hour'],
        ]}
      />
      <P>
        The tools: <A to="/resources/position-size">position size</A>, <A to="/resources/risk-of-ruin-calculator">risk of ruin</A> and{' '}
        <A to="/resources/forex-market-hours">forex market hours</A> (the daily reset is a clock time in the firm&apos;s zone).
      </P>

      <Callout title="What TradeQut does not do for prop accounts">
        It does not connect to the firm, read live equity, or warn you before a daily or overall limit; the firm&apos;s dashboard is the authority on a
        breach. Automatic sync is planned, not available. It records your closed trades and shows what led to the results.
      </Callout>

      <H2>Other journals for prop traders</H2>
      <P>
        Some products track challenge rules automatically from a live connection: Myfxbook&apos;s help centre describes a Prop Shield feature for daily
        loss, maximum loss and profit targets, and TradeZella syncs MetaTrader accounts. If live limit tracking is what you need, compare them on the{' '}
        <A to="/alternatives/myfxbook">Myfxbook</A> and <A to="/alternatives/tradezella">TradeZella</A> pages. TradeQut fits traders who want a private,
        upload-based journal focused on rules and review, at {usdMonth} a month after a {TRIAL_DAYS}-day trial. See <A to="/pricing">pricing</A>, the{' '}
        <A to="/forex-trading-journal">forex trading journal</A> page, and <A to="/blog/prop-trading-challenges">how to pass a prop challenge with a
        journal</A>. Two scenarios with made-up data show the method:{' '}
        <A to="/case-studies/ftmo-challenge-journal">tracking prop-firm loss limits in a journal</A> and{' '}
        <A to="/case-studies/multi-account-management">keeping several accounts separate</A>.
      </P>

      <Faq items={FAQ} />
      <Sources
        items={[
          { label: 'FTMO: Trading Objectives (page modified 2 Nov 2026)', url: 'https://ftmo.com/en/trading-objectives/', checked: '2026-11-15' },
          { label: 'Myfxbook Help: Prop Shield', url: 'https://www.myfxbook.com/help/knowledge-base/prop-shield/', checked: '2026-11-15' },
        ]}
      />
      <Disclaimer>
        TradeQut is not affiliated with any prop firm; each firm&apos;s rules page is the authority. TradeQut is a journaling and analytics tool, not an
        investment adviser, and nothing here is a recommendation to trade or to buy any challenge.
      </Disclaimer>
      <SignupCta />
    </ContentPageShell>
  );
}
