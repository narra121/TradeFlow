import { ContentPageShell } from '@/components/content/ContentPageShell';
import { CalculatorCard } from '@/components/content/CalculatorCard';
import { RESOURCES_SCHEMA } from '@/config/seo';
import { A, H2, P } from '@/content/components/ArticleParts';
import { Crosshair, Scale, DollarSign } from 'lucide-react';

export function ResourcesPage() {
  return (
    <ContentPageShell
      title="Trading Tools & Calculators - Free | TradeQut"
      description="Free trading calculators: position size, risk-reward ratio, and pip value. Essential tools for every trader."
      path="/resources"
      jsonLd={RESOURCES_SCHEMA}
      maxWidth="max-w-5xl"
    >
      <header className="mb-10">
        <h1 className="mb-3 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">Trading calculators</h1>
        <p className="max-w-2xl text-base text-foreground-soft">
          Free tools to size positions, check risk-reward and value a pip. No signup required.
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
        <A to="/resources/pip-calculator">pip value calculator</A>; see also the{' '}
        <A to="/blog/forex-trading-journal">forex journal guide</A>. Terms such as drawdown, expectancy and R multiple are
        defined in the <A to="/glossary">glossary</A>. A calculator plans one trade; a journal shows whether you followed
        the plan, which is what <A to="/pricing">TradeQut</A> is for.
      </P>
    </ContentPageShell>
  );
}
