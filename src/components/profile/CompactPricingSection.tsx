import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
import { FEATURES } from '@/components/subscription/PricingCards';
import { cn } from '@/lib/utils';

interface CompactPricingSectionProps {
  currency: 'INR' | 'USD';
  currencySymbol: string;
  onSubscribe: (amount: number, cycle: 'monthly' | 'annual') => Promise<void>;
  isProcessing: boolean;
  availablePlans: Array<{
    planId: string;
    name: string;
    period: string;
    amount: number;
    currency: string;
    monthlyEquivalent?: number;
  }>;
}

export function CompactPricingSection({
  currency,
  currencySymbol,
  onSubscribe,
  isProcessing,
  availablePlans,
}: CompactPricingSectionProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  const activePlan = availablePlans.find(
    (p) => p.period === billingCycle && p.currency.toUpperCase() === currency
  );

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50 rounded-xl">
      <CardHeader className="text-center pb-2">
        <h3 className="text-lg font-semibold">Upgrade Your Plan</h3>
        <p className="text-sm text-muted-foreground">Unlock AI insights and go ad-free</p>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex justify-center">
          <div className="bg-muted/50 rounded-lg p-1 border border-border/50 inline-flex">
            <button
              type="button"
              className={cn(
                'px-4 py-1.5 rounded-md text-sm transition-all',
                billingCycle === 'monthly'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setBillingCycle('monthly')}
            >
              Monthly
            </button>
            <button
              type="button"
              className={cn(
                'px-4 py-1.5 rounded-md text-sm transition-all',
                billingCycle === 'yearly'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setBillingCycle('yearly')}
            >
              Yearly
              {billingCycle === 'yearly' && (
                <span className="bg-primary-foreground/20 px-1.5 py-0.5 rounded text-[10px] ml-1.5">
                  Save 16%
                </span>
              )}
            </button>
          </div>
        </div>

        {activePlan ? (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 sm:p-8 text-center max-w-md mx-auto">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                {currencySymbol}{activePlan.amount}
              </span>
              <span className="text-sm text-muted-foreground">/{activePlan.period === 'yearly' ? 'year' : 'month'}</span>
            </div>

            {billingCycle === 'yearly' && activePlan.monthlyEquivalent != null && (
              <p className="text-primary text-sm mt-1">
                ~{currencySymbol}{activePlan.monthlyEquivalent}/month
              </p>
            )}

            <Button
              className="mt-6 w-full"
              disabled={isProcessing}
              onClick={() => onSubscribe(activePlan.amount, billingCycle === 'yearly' ? 'annual' : 'monthly')}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Subscribe Now'
              )}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center">
            No plan available for the selected billing cycle.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md mx-auto">
          {FEATURES.map((feature) => (
            <div key={feature.label} className="flex items-center gap-2">
              <Check className="text-primary w-4 h-4 shrink-0" />
              <span className="text-sm text-muted-foreground">{feature.label}</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6">
          These charges are purely to cover development and infrastructure costs only and may increase
          in future if the infrastructure cost increases.
        </p>
      </CardContent>
    </Card>
  );
}
