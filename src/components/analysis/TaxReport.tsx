import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Panel } from '@/components/ui/panel';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Money } from '@/components/ui/money';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { LockedPreview } from '@/components/billing/ProGate';
import { ScopeBarSlot } from '@/components/shell/chrome';
import { useScopeCapital } from '@/components/stats/useScopeCapital';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useIsMobile } from '@/hooks/use-mobile';
import { useGetTaxReportQuery, type TaxBucket } from '@/store/api/statsApi';
import { financialYear, financialYears, formatFyRange } from './taxYear';
import { formatMoney } from '@/lib/format';

const CURRENCY = 'INR';

interface Line {
  label: string;
  note?: string;
  bucket: TaxBucket;
}

function sum(lines: Line[]): TaxBucket {
  return lines.reduce<TaxBucket>(
    (t, l) => ({ trades: t.trades + l.bucket.trades, wins: t.wins + l.bucket.wins, losses: t.losses + l.bucket.losses, grossPnl: t.grossPnl + l.bucket.grossPnl, fees: t.fees + l.bucket.fees, netPnl: t.netPnl + l.bucket.netPnl }),
    { trades: 0, wins: 0, losses: 0, grossPnl: 0, fees: 0, netPnl: 0 },
  );
}

function Charges({ rows }: { rows: [string, number][] }) {
  return (
    <dl className="grid gap-x-6 sm:grid-cols-2">
      {rows.map(([label, value], i) => (
        <div key={label} className={`flex min-h-8 items-baseline justify-between gap-3 border-b border-border/60 text-[13px] ${i === rows.length - 1 ? 'sm:col-span-2 font-medium' : ''}`}>
          <dt className="text-foreground-soft">{label}</dt>
          <dd className="font-mono tabular-nums">{formatMoney(value, CURRENCY, { decimals: 2 })}</dd>
        </div>
      ))}
    </dl>
  );
}

/** India charges and tax P&L for one financial year (Pro). Figures are in rupees; it needs rupee accounts in scope. */
export function TaxReport() {
  const ent = useEntitlements();
  const isMobile = useIsMobile();
  const { accounts, selectedAccountId } = useScopeCapital();
  const [params, setParams] = useSearchParams();
  const years = useMemo(() => financialYears(), []);
  const wanted = params.get('fy');
  const fy = wanted && years.includes(wanted) ? wanted : financialYear();

  const pool = selectedAccountId ? accounts.filter((a) => a.id === selectedAccountId) : accounts.filter((a) => a.id && a.id !== '-1');
  const inr = pool.length > 0 && pool.every((a) => a.currency === CURRENCY);
  const allowed = ent.isError || ent.can('tax_report');
  // `currentData`: while another year or account loads, `data` still holds the last one's report.
  const { currentData: data, isLoading, isError, error, refetch } = useGetTaxReportQuery({ fy, accountId: selectedAccountId ?? undefined }, { skip: !allowed || !inr });

  const setFy = (next: string) => {
    const q = new URLSearchParams(params);
    q.set('tab', 'tax');
    q.set('fy', next);
    setParams(q, { replace: true });
  };

  if (ent.isLoading) return <Skeleton className="h-48" aria-busy="true" />;
  if (!allowed) return <LockedPreview title="Tax report" question="What did trading cost you in charges, and what is your profit for the financial year, by category?" currency={ent.currency} />;

  const fyControl = (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span id="fy-label">Financial year</span>
      <Select value={fy} onValueChange={setFy}>
        <SelectTrigger aria-labelledby="fy-label" className="h-7 w-32 text-[13px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
  // A phone's scope bar has no room beside the account and period.
  const picker = isMobile ? fyControl : <ScopeBarSlot side="left">{fyControl}</ScopeBarSlot>;

  if (!inr) {
    return (
      <>
        {picker}
        <EmptyState title="The tax report is in rupees." description="Pick an account in rupees in the top bar. It covers Indian equity, futures and options, and commodity trades." />
      </>
    );
  }
  if (isError) return <>{picker}<ErrorState title="Couldn't load the tax report." description="Your trades are unchanged." error={error} onRetry={() => void refetch()} /></>;
  if (isLoading || !data) return <>{picker}<Skeleton className="h-64" aria-busy="true" /></>;

  const lines: Line[] = [
    { label: 'Intraday equity', note: 'Speculative business income', bucket: data.intradayEquity },
    { label: 'Futures and options', note: 'Non-speculative business income', bucket: data.fno },
    { label: 'Commodity derivatives', note: 'Non-speculative business income', bucket: data.commodity },
    { label: 'Equity delivery, short-term', bucket: data.delivery.shortTerm },
    { label: 'Equity delivery, long-term', bucket: data.delivery.longTerm },
  ];
  const total = sum(lines);
  const c = data.charges;

  return (
    <div className="space-y-4">
      {picker}
      <Panel title={`Financial year ${data.fy}`} description={formatFyRange(data.period.from, data.period.to)} padded={false}>
        {total.trades === 0 ? (
          <p className="px-4 pb-4 pt-3 text-sm text-muted-foreground">No closed trades in this financial year.</p>
        ) : (
          <div role="region" tabIndex={0} aria-label={`Financial year ${data.fy} by category`} className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <table className="w-full text-[13px]">
              <caption className="sr-only">Profit and charges by category, financial year {data.fy}</caption>
              <thead>
                <tr className="h-8 border-b border-border text-left text-xs text-muted-foreground">
                  <th scope="col" className="px-4 font-medium">Category</th>
                  <th scope="col" className="px-3 text-right font-medium">Trades</th>
                  <th scope="col" className="px-3 text-right font-medium">Gross P&amp;L</th>
                  <th scope="col" className="px-3 text-right font-medium">Charges</th>
                  <th scope="col" className="px-4 text-right font-medium">Net P&amp;L</th>
                </tr>
              </thead>
              <tbody>
                {lines.filter((l) => l.bucket.trades > 0).map((l) => (
                  <tr key={l.label} className="h-10 border-b border-border/60">
                    <th scope="row" className="min-w-[10rem] px-4 text-left font-normal">
                      {l.label}
                      {l.note && <span className="block text-xs text-muted-foreground">{l.note}</span>}
                    </th>
                    <td className="px-3 text-right font-mono tabular-nums">{l.bucket.trades}</td>
                    <td className="px-3 text-right"><Money value={l.bucket.grossPnl} currency={CURRENCY} /></td>
                    <td className="px-3 text-right font-mono tabular-nums">{formatMoney(l.bucket.fees, CURRENCY)}</td>
                    <td className="px-4 text-right"><Money value={l.bucket.netPnl} currency={CURRENCY} /></td>
                  </tr>
                ))}
                <tr className="h-10 border-t border-border-strong font-medium">
                  <th scope="row" className="px-4 text-left font-medium">Total</th>
                  <td className="px-3 text-right font-mono tabular-nums">{total.trades}</td>
                  <td className="px-3 text-right"><Money value={total.grossPnl} currency={CURRENCY} /></td>
                  <td className="px-3 text-right font-mono tabular-nums">{formatMoney(total.fees, CURRENCY)}</td>
                  <td className="px-4 text-right"><Money value={total.netPnl} currency={CURRENCY} /></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {/* A phone shows Category, Trades and part of Gross P&L; Charges and Net P&L are one swipe away. */}
        {isMobile && total.trades > 0 && <p className="border-t border-border/60 px-4 py-2 text-xs text-muted-foreground">Scroll the table sideways for Charges and Net P&amp;L.</p>}
      </Panel>

      {data.fno.trades > 0 && (
        <Panel title="Futures and options turnover">
          <p className="text-[13px]">
            <span className="font-mono tabular-nums">{formatMoney(data.fno.turnover, CURRENCY, { decimals: 2 })}</span>
            <span className="text-muted-foreground"> compared with the fixed </span>
            <span className="font-mono tabular-nums">{formatMoney(data.fno.auditThreshold, CURRENCY, { decimals: 0 })}</span>
            <span className="text-muted-foreground"> this report uses: {data.fno.auditThresholdExceeded ? 'above it.' : 'not above it.'}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            The total adds the absolute profit or loss of each closed futures and options trade and the premium on the sale leg of every options trade.
            For the ICAI Guidance Note readings and the ₹1 crore limit, see the{' '}
            <a href="/resources/fo-turnover-calculator" target="_blank" rel="noopener" className="text-primary underline underline-offset-4">
              F&amp;O turnover calculator
            </a>
            .
          </p>
        </Panel>
      )}

      <Panel title="Charges">
        <Charges
          rows={[
            ['Securities transaction tax', c.stt],
            ['Exchange charges', c.exchange],
            ['SEBI turnover fee', c.sebi],
            ['Stamp duty', c.stamp],
            ['Brokerage, GST and other', c.brokerageGstAndOther],
            ['Total charges', c.total],
          ]}
        />
      </Panel>

      {data.notCovered.trades > 0 && (
        <p className="text-[13px] text-muted-foreground">
          {data.notCovered.trades} forex, crypto or CFD {data.notCovered.trades === 1 ? 'trade is' : 'trades are'} not covered by this report ({formatMoney(data.notCovered.netPnl, CURRENCY, { sign: true })} net).
        </p>
      )}
      <ul className="space-y-1 text-xs text-muted-foreground">
        {data.warnings.map((w) => <li key={w}>{w}</li>)}
      </ul>
    </div>
  );
}
