import { ContentPageShell } from '@/components/content/ContentPageShell';
import { CalculatorCard } from '@/components/content/CalculatorCard';
import { RESOURCES_SCHEMA } from '@/config/seo';
import { Crosshair, Scale, DollarSign } from 'lucide-react';

export function ResourcesPage() {
  return (
    <ContentPageShell
      title="Trading Tools & Calculators - Free | TradeQut"
      description="Free trading calculators: position size, risk-reward ratio, and pip value. Essential tools for every trader."
      path="/resources"
      jsonLd={RESOURCES_SCHEMA}
      navLabel="Resources navigation"
      maxWidth="max-w-5xl"
    >
      {/* Hero */}
      <div className="text-center mb-12 sm:mb-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
          Trading Tools & Calculators
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Free tools to help you manage risk, size positions, and plan trades. No signup required.
        </p>
      </div>

      {/* Calculator grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CalculatorCard
          title="Position Size Calculator"
          description="Calculate the right position size based on your account balance, risk tolerance, and stop loss distance."
          href="/resources/position-size"
          icon={Crosshair}
        />
        <CalculatorCard
          title="Risk-Reward Calculator"
          description="Determine your risk-reward ratio, potential profit and loss, and the breakeven win rate for any trade."
          href="/resources/risk-reward"
          icon={Scale}
        />
        <CalculatorCard
          title="Pip Value Calculator"
          description="Calculate the value of a pip for any currency pair and lot size in your account currency."
          href="/resources/pip-calculator"
          icon={DollarSign}
        />
      </div>
    </ContentPageShell>
  );
}
