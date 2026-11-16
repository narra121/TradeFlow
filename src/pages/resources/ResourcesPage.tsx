import { ContentPageShell } from '@/components/content/ContentPageShell';
import { CalculatorCard } from '@/components/content/CalculatorCard';
import { RESOURCES_SCHEMA } from '@/config/seo';
import { A, H2, P } from '@/content/components/ArticleParts';
import { Crosshair, Scale, DollarSign, Sigma, Receipt, Landmark, FileSpreadsheet, BarChart3, Clock, ShieldAlert, Gauge, TrendingDown, TrendingUp } from 'lucide-react';

export function ResourcesPage() {
  return (
    <ContentPageShell
      title="Trading Tools & Calculators - Free | TradeQut"
      description="Free trading calculators for forex, gold and Indian F&O: position size, pip value, margin, prop-firm drawdown, market hours, risk of ruin, F&O charges."
      path="/resources"
      jsonLd={RESOURCES_SCHEMA}
      maxWidth="max-w-5xl"
    >
      <header className="mb-10">
        <h1 className="mb-3 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">Trading calculators</h1>
        <p className="max-w-2xl text-base text-foreground-soft">
          Free tools to size positions, check risk-reward and value a pip, for forex, gold and Indian F&amp;O. No signup required.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CalculatorCard
          title="Position size calculator"
          description="Calculate the right position size based on your account balance, risk tolerance, and stop loss distance."
          href="/resources/position-size"
          icon={Crosshair}
        />
        <CalculatorCard
          title="Risk-reward calculator"
          description="Determine your risk-reward ratio, potential profit and loss, and the breakeven win rate for any trade."
          href="/resources/risk-reward"
          icon={Scale}
        />
        <CalculatorCard
          title="Pip value calculator"
          description="Calculate the value of a pip for any currency pair and lot size in your account currency."
          href="/resources/pip-calculator"
          icon={DollarSign}
        />
        <CalculatorCard
          title="Expectancy calculator"
          description="Expectancy per trade in money and in R from your win rate, average win and average loss, and the break-even win rate for any reward:risk."
          href="/resources/expectancy-calculator"
          icon={Sigma}
        />
        <CalculatorCard
          title="Risk of ruin calculator"
          description="The chance a run of losses takes the account down to a drawdown you choose, from win rate, reward:risk and risk per trade."
          href="/resources/risk-of-ruin-calculator"
          icon={TrendingDown}
        />
        <CalculatorCard
          title="Compounding calculator"
          description="What a steady return per day, week or month grows a balance to, the yearly rate it implies and the rate a target needs."
          href="/resources/compounding-calculator"
          icon={TrendingUp}
        />
      </div>

      <H2>Forex and prop-firm tools</H2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CalculatorCard
          title="Forex market hours"
          description="Sydney, Tokyo, London and New York sessions and their overlaps in your time zone, with this year's daylight-saving changes."
          href="/resources/forex-market-hours"
          icon={Clock}
          cta="Open the clock"
        />
        <CalculatorCard
          title="Prop firm drawdown calculator"
          description="Room left under a daily loss and a static or trailing maximum loss limit, and the lots that fit at your stop."
          href="/resources/prop-firm-drawdown-calculator"
          icon={ShieldAlert}
        />
        <CalculatorCard
          title="Margin and leverage calculator"
          description="The margin a forex or gold position ties up at your leverage, in your account currency, and its effective leverage."
          href="/resources/margin-calculator"
          icon={Gauge}
        />
      </div>

      <H2>India F&amp;O tools and data</H2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CalculatorCard
          title="F&O turnover calculator"
          description="Turnover for tax audit purposes by the ICAI method: the sum of absolute profits and losses, with the premium rule shown."
          href="/resources/fo-turnover-calculator"
          icon={Landmark}
        />
        <CalculatorCard
          title="F&O charges and STT rates"
          description="STT, exchange charge, SEBI fee, stamp duty and GST for a trade date, with every rate change and its circular."
          href="/resources/fo-charges-rates"
          icon={Receipt}
        />
        <CalculatorCard
          title="F&O journal Excel template"
          description="A free .xlsx journal for NSE F&O with estimated charges, net P&L and per-setup and per-weekday summaries."
          href="/blog/trading-journal-excel-template"
          icon={FileSpreadsheet}
          cta="Get the template"
        />
        <CalculatorCard
          title="SEBI F&O study, sourced"
          description="SEBI's findings on individual traders' F&O losses, every figure with its document and page."
          href="/sebi-fo-study"
          icon={BarChart3}
          cta="Read the figures"
        />
      </div>

      <H2>Which calculator to use</H2>
      <P>
        Start with the <A to="/resources/position-size">position size calculator</A> before every trade: it turns the
        money you are willing to lose and the distance to your stop into a quantity. The method is explained in{' '}
        <A to="/blog/position-sizing-fixed-risk">position sizing with fixed risk</A>.
      </P>
      <P>
        Use the <A to="/resources/risk-reward">risk-reward calculator</A> to check a setup: it gives the ratio and the
        win rate you need to break even at that ratio. Background reading:{' '}
        <A to="/blog/risk-reward-ratio-guide">the risk-reward guide</A>, <A to="/blog/r-multiple-explained">R multiples</A>{' '}
        and <A to="/blog/trading-expectancy-formula">the expectancy formula</A>.
      </P>
      <P>
        Forex traders can value a pip in their account currency with the{' '}
        <A to="/resources/pip-calculator">pip value calculator</A> (gold included), check the margin with the{' '}
        <A to="/resources/margin-calculator">margin calculator</A> and see when sessions overlap on the{' '}
        <A to="/resources/forex-market-hours">market hours clock</A>. In a prop-firm challenge, the{' '}
        <A to="/resources/prop-firm-drawdown-calculator">drawdown calculator</A> gives today&apos;s room under the limits and
        the <A to="/resources/risk-of-ruin-calculator">risk of ruin calculator</A> how likely a losing run is to end it. See
        also the <A to="/forex-trading-journal">forex trading journal</A>; Indian F&amp;O traders, the{' '}
        <A to="/trading-journal-india">journal for Indian traders</A>. Terms such as drawdown, expectancy and R multiple are
        defined in the <A to="/glossary">glossary</A>. A calculator plans one trade; a journal shows whether you followed
        the plan, which is what <A to="/pricing">TradeQut</A> is for.
      </P>
    </ContentPageShell>
  );
}
