import { ContentPageShell } from '@/components/content/ContentPageShell';
import { A, Callout, Crumbs, Disclaimer, Faq, H2, P, ShortAnswer, SignupCta, Sources, Table, UL } from '@/content/components/ArticleParts';
import { BROKER_PAGES } from '@/content/brokers';
import { TRIAL_DAYS, proPrice } from '@/content/product-facts';
import { getSeoPage } from '@/content/seo-pages';
import { seoPageSchema } from '@/config/seo';

const inrMonth = proPrice('INR', 'month').display;
const inrYear = proPrice('INR', 'year').display;

const FAQ = [
  {
    question: 'What should an F&O trading journal record?',
    answer:
      'For every trade: the underlying, expiry, strike and call or put, the quantity, entry and exit premium, the planned stop and target, the charges, the setup, and any mistake or rule the trade broke. With those fields you can compare calls with puts, expiry day with other days, and one setup with another.',
  },
  {
    question: 'Does TradeQut calculate STT and other charges on options?',
    answer:
      'It estimates them. For files imported from Zerodha, Dhan, Upstox, Angel One and Groww, TradeQut estimates brokerage, STT, exchange transaction charges, SEBI fee, stamp duty and GST for each trade at the rates in force on the trade date, including the higher STT on futures and options from 1 April 2026. Your contract note is the authoritative figure.',
  },
  {
    question: 'Can I see my expiry-day trades separately?',
    answer:
      'Yes. Analytics has an expiry-day breakdown and a calls-or-puts breakdown for options, each with the number of trades behind it, and a what-if replay of the rule "No options trades on expiry day" that shows what the rule would have changed.',
  },
  {
    question: 'Does it work for option sellers and multi-leg trades?',
    answer:
      'On import each leg becomes its own trade with its instrument, direction and charges, so bought and sold options are both recorded. To review a spread as one idea, give its legs the same strategy name or tag.',
  },
  {
    question: 'Does TradeQut give option tips or strike recommendations?',
    answer:
      'No. TradeQut analyses your own past trades. It never recommends securities, strikes or trades, and it is not a SEBI-registered investment adviser.',
  },
];

export default function FoTradingJournalPage() {
  const page = getSeoPage('/fo-trading-journal');
  return (
    <ContentPageShell title={page.title} description={page.description} path={page.path} jsonLd={seoPageSchema(page, [], FAQ)}>
      {page.parent && <Crumbs parent={page.parent} current={page.label} />}
      <h1 className="mb-4 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">
        F&amp;O trading journal for Nifty and Bank Nifty traders
      </h1>
      <ShortAnswer>
        TradeQut is a futures and options journal for Indian traders. Import the trade file from your broker, get each
        trade with its strike, expiry and estimated charges, then see net P&amp;L by calls and puts, expiry day, weekday
        and hour, and what each broken rule cost. {inrMonth} a month after a {TRIAL_DAYS}-day free trial.
      </ShortAnswer>

      <H2>What an F&amp;O journal has to record</H2>
      <P>
        A share trade is a symbol, a price and a quantity. An option trade is also a strike, an expiry, a call or a put and
        a premium that decays, and a round trip can lose money after charges even when the premium moved your way. A
        journal that only stores a symbol and a profit cannot show any of that.
      </P>
      <Table
        caption="Fields on an F&O trade and where they come from"
        head={['Field', 'Why it matters', 'How it gets in']}
        rows={[
          ['Underlying, expiry, strike, call or put', 'Compare calls with puts and expiry day with other days', 'Read from the symbol in your broker file'],
          ['Quantity, entry and exit premium, times', 'The trade itself, and how long you held it', 'Read from the broker file'],
          ['Charges', 'Net P&L, not gross', 'Estimated per trade at the rates of the trade date'],
          ['Stop loss and target', 'Without a planned risk there is no R multiple', 'You add them'],
          ['Strategy or setup', 'Which setups earn and which lose', 'You pick from your own short list'],
          ['Mistake and broken rule', 'What each habit costs in rupees', 'You tag the trade'],
        ]}
      />

      <H2>Charges change the answer</H2>
      <P>
        On 1 April 2026 STT on the sell side rose from 0.02% to 0.05% for futures and from 0.10% to 0.15% of premium for
        options. For a trader taking many small option trades, charges can turn a gross profit into a net loss. Broker
        tradebooks list fills, not charges, so TradeQut estimates brokerage, STT, exchange transaction charges, SEBI fee,
        stamp duty and GST for each imported trade at the rates in force on its date. The arithmetic, with a worked
        example, is in <A to="/blog/fo-trading-charges-india">F&amp;O charges in India</A>.
      </P>
      <Callout title="Estimates, not your contract note">
        The figures come from published rates. Your contract note is the authoritative record of what you were charged.
      </Callout>

      <H2>Questions the journal answers</H2>
      <UL>
        <li>Calls or puts: which work for you?</li>
        <li>How do you do on expiry day, and would &ldquo;no options trades on expiry day&rdquo; have helped?</li>
        <li>Which weekdays and hours are your best and worst?</li>
        <li>Which trade of the day is your best, and what do trades after two losses cost?</li>
        <li>How long do you hold winners against losers?</li>
        <li>How much of the gross P&amp;L went to charges, and which trades had a target that did not cover them?</li>
      </UL>
      <P>
        Every breakdown shows how many trades it rests on and carries a sample label, so a handful of trades is not read
        as an edge. Win rate is shown against your break-even win rate and expectancy is shown in R; both are explained in{' '}
        <A to="/blog/trading-expectancy-formula">the expectancy formula</A> and{' '}
        <A to="/blog/r-multiple-explained">R multiples</A>. What to write on each trade is covered in{' '}
        <A to="/blog/options-trading-journal-india">the options journal fields</A>.
      </P>

      <H2>Get your F&amp;O trades in</H2>
      <P>Download the F&amp;O trade report from your broker and drop it on the Import page. Step-by-step pages:</P>
      <UL>
        {BROKER_PAGES.map((b) => (
          <li key={b.id}>
            <A to={b.path}>{b.name} trading journal</A>: {b.fileName}
          </li>
        ))}
      </UL>
      <P>
        Any other broker works through a CSV or Excel file where you match the columns. When there is no export at all,{' '}
        <A to="/import-trades-from-screenshot">import the trades from a screenshot</A>. TradeQut does not connect to your
        broker account; automatic sync is planned, not available.
      </P>

      <H2>Rules, and a tax report for your CA</H2>
      <P>
        Write your rules, for example a daily loss limit or no new trade after two losses, and mark the ones a trade
        broke. Goals &amp; rules shows each rule week by week with what the breaks cost. For each Indian financial year the
        tax report splits charges into STT, exchange charges, SEBI fee and stamp duty, with brokerage, GST and other
        charges as the remainder, and shows P&amp;L by tax category including F&amp;O. TradeQut does not file taxes and this
        is not tax advice.
      </P>

      <H2>What it costs</H2>
      <P>
        A {TRIAL_DAYS}-day free trial with every Pro feature and no card. Then Pro is {inrMonth} a month or {inrYear} a
        year; without Pro the journal is read-only, so you can still view and export your trades. See{' '}
        <A to="/pricing">pricing</A>, the <A to="/trading-journal-india">journal for Indian traders</A> and{' '}
        <A to="/alternatives">how TradeQut compares</A>. Planning a trade? Use the{' '}
        <A to="/resources/position-size">position size</A> and <A to="/resources/risk-reward">risk-reward</A> calculators.
      </P>

      <Faq items={FAQ} />
      <Sources
        items={[
          { label: 'NSE circular 02/2026 (NSE/FATAX/73524): changes in rates of Securities Transaction Tax, 31 March 2026', url: 'https://nsearchives.nseindia.com/content/circulars/FATAX73524.pdf', checked: '2026-11-12' },
          { label: 'Zerodha: brokerage and charges', url: 'https://zerodha.com/charges', checked: '2026-11-12' },
        ]}
      />
      <Disclaimer />
      <SignupCta />
    </ContentPageShell>
  );
}
