import { Panel } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { plural } from '@/lib/evidence';
import type { Analysis } from '@/types/analysis';
import type { AnalysisState } from './useAnalysis';

/** The "pick an account" notice for figures that cannot add two currencies (§3.6 of the plan, as on the Tax tab). */
export function PickAccountNotice({ currencies, what = 'these figures' }: { currencies: string[]; what?: string }) {
  const list = currencies.length > 1 ? `${currencies.slice(0, -1).join(', ')} and ${currencies[currencies.length - 1]}` : 'several currencies';
  return (
    <p className="text-sm text-muted-foreground">
      Your trades in this scope are in {list}. Pick one account in the top bar to see {what}; amounts in different currencies are never added.
    </p>
  );
}

/** One notice in place of every panel that needs `GET /analysis` while the scope spans currencies. */
export function MixedCurrencyPanel({ currencies, what }: { currencies: string[]; what: string }) {
  return (
    <Panel title="Pick one account for the rest">
      <PickAccountNotice currencies={currencies} what={what} />
    </Panel>
  );
}

interface AnalysisGateProps {
  state: AnalysisState | undefined;
  /** Height of the loading placeholder, so the page does not jump when the figures arrive. */
  loadingHeight?: string;
  /** What the panel shows, for the mixed-currency notice. */
  what?: string;
  /** Fewer trades than this (by `count`) shows `tooFew` instead of the panel. */
  min?: number;
  count?: (a: Analysis) => number;
  tooFew?: (have: number, need: number) => React.ReactNode;
  /** Shown when the period has no trades at all. */
  empty?: React.ReactNode;
  /** Wraps every state but the figures (a panel without padding pads its notices). */
  stateClassName?: string;
  children: (a: Analysis) => React.ReactNode;
}

const muted = (text: React.ReactNode) => <p className="text-sm text-muted-foreground">{text}</p>;

/** Loading, error, mixed-currency, empty and too-few-trades states for a panel fed by `GET /analysis`. */
export function AnalysisGate({ state, loadingHeight = 'h-24', what, min = 0, count = (a) => a.tradeCount, tooFew, empty, stateClassName, children }: AnalysisGateProps) {
  const frame = (node: React.ReactNode) => (stateClassName ? <div className={stateClassName}>{node}</div> : <>{node}</>);
  if (!state || state.isLoading) return frame(<Skeleton className={loadingHeight} aria-label="Loading" />);
  if (state.mixed) return frame(<PickAccountNotice currencies={state.mixed} what={what} />);
  if (state.isError || !state.data) return frame(<ErrorState title="Couldn't load this panel." description="The rest of the page keeps working." error={state.error} onRetry={state.refetch} />);
  const a = state.data;
  if (a.tradeCount === 0) return frame(empty ?? muted('No trades in this period.'));
  const have = count(a);
  if (have < min) return frame(tooFew ? tooFew(have, min) : muted(`Shown from ${plural(min, 'trade')}; this period has ${have}.`));
  return <>{children(a)}</>;
}

/** A titled panel whose body is an `AnalysisGate`. */
export function AnalysisPanel({ title, description, actions, padded = true, ...gate }: AnalysisGateProps & { title: string; description?: string; actions?: React.ReactNode; padded?: boolean }) {
  return (
    <Panel title={title} description={description} actions={actions} padded={padded}>
      <AnalysisGate stateClassName={padded ? undefined : 'p-4'} {...gate} />
    </Panel>
  );
}
