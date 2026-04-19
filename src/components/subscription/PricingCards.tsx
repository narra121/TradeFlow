import { Link } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/hooks/useCurrency';
import { cn } from '@/lib/utils';

interface PricingCardsProps {
  context: 'landing' | 'profile';
  currentStatus?: string | null;
  onSelectPlan?: (period: 'monthly' | 'yearly') => void;
  isProcessing?: boolean;
}

interface Feature {
  label: string;
  free: boolean;
}

const FEATURES: Feature[] = [
  { label: 'Unlimited trade entries', free: true },
  { label: 'Full analytics & charts', free: true },
  { label: 'Calendar view', free: true },
  { label: 'Trade import (CSV & screenshots)', free: true },
  { label: 'Multi-account support', free: true },
  { label: 'Goal & rule tracking', free: true },
  { label: 'Trade journal & notes', free: true },
  { label: 'Trading rules engine', free: true },
  { label: 'All future features', free: true },
  { label: 'AI-powered insights', free: false },
  { label: 'Ad-free experience', free: false },
];

interface TierConfig {
  id: 'free' | 'monthly' | 'yearly';
  name: string;
  priceUsd: string;
  priceInr: string;
  periodLabel: string;
  note: string;
  popular: boolean;
}

const TIERS: TierConfig[] = [
  {
    id: 'free',
    name: 'Free',
    priceUsd: '$0',
    priceInr: '\u20B90',
    periodLabel: 'forever',
    note: 'Includes ads',
    popular: false,
  },
  {
    id: 'monthly',
    name: 'Monthly',
    priceUsd: '$1.99',
    priceInr: '\u20B999',
    periodLabel: 'per month',
    note: 'No ads',
    popular: false,
  },
  {
    id: 'yearly',
    name: 'Yearly',
    priceUsd: '$19.99',
    priceInr: '\u20B9999',
    periodLabel: 'per year',
    note: 'No ads',
    popular: true,
  },
];

function getEquivalentMonthly(currency: 'INR' | 'USD'): string {
  if (currency === 'INR') return '~\u20B983/month';
  return '~$1.67/month';
}

function isActiveSubscriber(status: string | null | undefined): boolean {
  return status === 'active' || status === 'trialing';
}

export function PricingCards({
  context,
  currentStatus,
  onSelectPlan,
  isProcessing,
}: PricingCardsProps) {
  const { currency } = useCurrency();

  const isFreeUser = !currentStatus || !isActiveSubscriber(currentStatus);

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {TIERS.map((tier) => {
          const price = currency === 'INR' ? tier.priceInr : tier.priceUsd;
          const isFree = tier.id === 'free';
          const isPopular = tier.popular;

          return (
            <div
              key={tier.id}
              className={cn(
                'rounded-2xl border p-6 sm:p-8 flex flex-col',
                isPopular
                  ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                  : 'border-border/50 bg-card/50'
              )}
            >
              {/* Header with badges */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    {tier.name}
                  </h3>
                  {isPopular && (
                    <Badge>MOST POPULAR</Badge>
                  )}
                  {context === 'profile' && isFree && isFreeUser && (
                    <Badge variant="secondary">Your Plan</Badge>
                  )}
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-bold text-foreground">
                    {price}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {tier.periodLabel}
                  </span>
                </div>
              </div>

              {/* Note */}
              <p className="text-sm text-muted-foreground mb-4">
                {tier.id === 'yearly'
                  ? `${tier.note} \u2022 ${getEquivalentMonthly(currency)}`
                  : tier.note}
              </p>

              {/* Features */}
              <ul className="space-y-2.5 mb-6 flex-1">
                {FEATURES.map((feature) => {
                  const included = isFree ? feature.free : true;
                  return (
                    <li key={feature.label} className="flex items-start gap-2 text-sm">
                      {included ? (
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      )}
                      <span
                        className={cn(
                          included
                            ? 'text-foreground'
                            : 'text-muted-foreground line-through'
                        )}
                      >
                        {feature.label}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {/* CTA */}
              <div className="mt-auto">
                {context === 'landing' && (
                  <Button
                    asChild
                    variant={isPopular ? 'default' : 'outline'}
                    className="w-full"
                  >
                    <Link to="/signup">
                      {isFree ? 'Get Started Free' : 'Get Started'}
                    </Link>
                  </Button>
                )}

                {context === 'profile' && isFree && (
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled
                  >
                    Current Plan
                  </Button>
                )}

                {context === 'profile' && !isFree && isFreeUser && (
                  <Button
                    variant={isPopular ? 'default' : 'outline'}
                    className="w-full"
                    disabled={isProcessing}
                    onClick={() =>
                      onSelectPlan?.(tier.id as 'monthly' | 'yearly')
                    }
                  >
                    {isProcessing
                      ? 'Processing...'
                      : tier.id === 'monthly'
                        ? 'Subscribe Monthly'
                        : 'Subscribe Yearly'}
                  </Button>
                )}

                {/* Active subscriber on paid cards: no CTA shown */}
              </div>
            </div>
          );
        })}
      </div>

      {/* Transparency note */}
      <p className="text-xs text-muted-foreground text-center mt-6">
        These charges are purely to cover development and infrastructure costs only and may increase in future if the infrastructure cost increases.
      </p>
    </div>
  );
}
