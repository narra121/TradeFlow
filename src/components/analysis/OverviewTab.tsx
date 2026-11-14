import { useMemo } from 'react';
import { Panel } from '@/components/ui/panel';
import { EquityChart } from '@/components/dashboard/EquityChart';
import { equitySeries } from '@/lib/dashboard';
import { StatementPanel } from './StatementPanel';
import { ConcentrationPanel, EdgeSummaryPanel, ResultBridgePanel, RollingExpectancyChart, WorkingPanel } from './OverviewPanels';
import { MixedCurrencyPanel } from './AnalysisGate';
import type { AnalyticsContext } from './drill';

/**
 * "Do I have an edge, and is it holding?": the statement (from `/stats`), then the evidence from `GET /analysis` — win
 * rate against break-even, expectancy in R, the rolling expectancy under the equity curve, where the result came from,
 * dependence on a few trades, and what is working by verdict (never by net P&L).
 */
export function OverviewTab({ ctx }: { ctx: AnalyticsContext }) {
  const { stats, pro, currency, analysis } = ctx;
  const points = useMemo(() => equitySeries(stats.dailyPnl, (d) => d), [stats.dailyPnl]);
  const money = analysis?.data?.currency ?? currency;

  return (
    <div className="space-y-4">
      <StatementPanel ctx={ctx} />
      {ctx.multi && (
        <p className="text-xs text-muted-foreground">
          Figures are for {currency}; switch currency in the bar above. Max drawdown needs one account, because a percentage of two currencies' starting balances means nothing.
        </p>
      )}
      {!analysis?.mixed && <EdgeSummaryPanel state={analysis} currency={money} />}
      <Panel>
        <EquityChart points={points} currency={currency} title="Equity and drawdown" />
      </Panel>
      {analysis?.mixed ? (
        <MixedCurrencyPanel currencies={analysis.mixed} what="the edge, the rolling expectancy, where the result came from and what is working" />
      ) : (
        <>
          <RollingExpectancyChart state={analysis} />
          <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
            <ResultBridgePanel state={analysis} currency={money} pro={pro} />
            <ConcentrationPanel state={analysis} currency={money} pro={pro} />
          </div>
          <WorkingPanel ctx={{ ...ctx, currency: money }} />
        </>
      )}
    </div>
  );
}
