import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Money } from '@/components/ui/money';
import { ErrorState } from '@/components/ui/error-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MetricInfo } from '@/components/stats/MetricInfo';
import { useWhatIfMutation } from '@/store/api/analysisApi';
import { plural } from '@/lib/evidence';
import { formatMoney, formatR } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Analysis, Detector, DetectorId, Dimension, WhatIfRule } from '@/types/analysis';
import { AnalysisPanel } from './AnalysisGate';
import { EvidenceText } from './EvidenceText';
import { DIMENSION_LABEL } from './OverviewPanels';
import { useOpenTrades, type AnalysisState } from './useAnalysis';

/** Draft text for `Make this a rule` (Goals & rules opens its add row with it, `?addRule=`); the trader edits it there. */
export const RULE_TEXT: Record<DetectorId, string> = {
  reentryAfterLoss: 'No new trade within 15 minutes of a losing trade',
  afterLoss: 'Stop for the day after 2 losing trades',
  sizeUpAfterLoss: 'Never raise my risk after a losing trade',
  tradeNumber: 'At most 2 trades a day',
  overtradingDay: 'At most 3 trades a day',
  beyondStop: 'Exit at my stop; never move it further away',
  noStop: 'Set a stop loss before every entry',
  targetNotReached: 'Hold winners to the planned target',
  losersHeldLonger: 'Close a losing trade at its stop, not later',
  fees: 'Skip trades whose target does not cover the charges',
  brokenRule: 'Read my rules before the first trade of the day',
  afterDailyLimit: 'Stop for the day once the daily loss limit is hit',
  expiryDay: 'No options trades on expiry day',
};

const ruleHref = (id: DetectorId) => `/app/goals?${new URLSearchParams({ addRule: RULE_TEXT[id] }).toString()}`;

function DetectorRow({ d, currency, pro }: { d: Detector; currency?: string; pro: boolean }) {
  const open = useOpenTrades();
  return (
    <tr className="border-b border-border/60 align-top last:border-0">
      <th scope="row" className="px-4 py-2 text-left font-normal">
        <span className="block font-medium">{d.title}</span>
        {pro && <span className="mt-0.5 block max-w-prose text-xs text-muted-foreground">{d.detail}</span>}
        <span className="mt-1 flex flex-wrap gap-x-3 text-xs sm:hidden">
          <span className="text-muted-foreground">{plural(d.count, 'trade')}</span>
          {pro && <Money value={d.net} currency={currency} neutral={d.verdict === 'watch'} />}
          {pro && <EvidenceText verdict={d.verdict} trades={d.count} inline />}
        </span>
      </th>
      <td className="hidden px-3 py-2 text-right font-mono tabular-nums sm:table-cell">{d.count}</td>
      {pro && (
        <>
          <td className="hidden px-3 py-2 text-right sm:table-cell"><Money value={d.net} currency={currency} neutral={d.verdict === 'watch'} /></td>
          <td className="hidden whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums md:table-cell">
            {formatR(d.avgR)} <span className="text-muted-foreground">vs {formatR(d.normalAvgR)}</span>
          </td>
          <td className="hidden px-3 py-2 md:table-cell"><EvidenceText verdict={d.verdict} trades={d.count} /></td>
        </>
      )}
      <td className="px-4 py-2">
        <span className="flex flex-col items-end gap-1 sm:flex-row sm:justify-end">
          {pro && d.tradeIds.length > 0 && (
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2" aria-label={`Trades for ${d.title} (${plural(d.tradeIds.length, 'trade')})`} onClick={() => open(d.tradeIds)}>
              Trades
            </Button>
          )}
          <Button asChild variant="outline" size="sm" className="h-7 px-2">
            <Link to={ruleHref(d.id)} aria-label={`Make this a rule: ${RULE_TEXT[d.id]}`}>Make this a rule</Link>
          </Button>
        </span>
      </td>
    </tr>
  );
}

/** One row per detector of the fixed list (report §4.6): count, net, avg R against normal, evidence, trades, a rule. */
export function DetectorBoard({ state, currency, pro }: { state?: AnalysisState; currency?: string; pro: boolean }) {
  return (
    <AnalysisPanel
      title="What do I do that costs money?"
      description="Checked on every trade; most need no tagging"
      state={state}
      loadingHeight="h-64"
      what="the behaviour checks"
      padded={false}
    >
      {(a) => <DetectorTable a={a} currency={currency} pro={pro} />}
    </AnalysisPanel>
  );
}

function DetectorTable({ a, currency, pro }: { a: Analysis; currency?: string; pro: boolean }) {
  const seen = useMemo(() => a.detectors.filter((d) => d.count > 0).sort((x, y) => (pro ? x.net - y.net : y.count - x.count)), [a.detectors, pro]);
  const unseen = a.detectors.filter((d) => d.count === 0);
  return (
    <>
      {seen.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">None of the behaviours shows up in this period.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <caption className="sr-only">Behaviour checks</caption>
            <thead>
              <tr className="h-8 border-b border-border text-left text-xs text-muted-foreground">
                <th scope="col" className="px-4 font-medium">Behaviour</th>
                <th scope="col" className="hidden px-3 text-right font-medium sm:table-cell">Trades</th>
                {pro && (
                  <>
                    <th scope="col" className="hidden px-3 text-right font-medium sm:table-cell">Net P&amp;L</th>
                    <th scope="col" className="hidden px-3 text-right font-medium md:table-cell"><MetricInfo metric="vsNormal" /></th>
                    <th scope="col" className="hidden px-3 font-medium md:table-cell"><MetricInfo metric="evidence" /></th>
                  </>
                )}
                <th scope="col" className="px-4"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {seen.map((d) => <DetectorRow key={d.id} d={d} currency={currency} pro={pro} />)}
            </tbody>
          </table>
        </div>
      )}
      <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
        {!pro && <>Net P&amp;L, R against your normal, evidence and the trades behind each row are part of <span className="text-accent-text">Pro</span>. </>}
        {unseen.length > 0 && <>Not seen in this period: {unseen.map((d) => d.title.toLowerCase()).join(', ')}. </>}
        Counts are facts; a behaviour is called a leak only with 30 trades on each side and a steady difference.
      </p>
    </>
  );
}

type Kind = WhatIfRule['kind'];
const KINDS: { kind: Kind; label: string }[] = [
  { kind: 'stopAfterLosses', label: 'Stop for the day after losing trades' },
  { kind: 'maxTradesPerDay', label: 'At most this many trades a day' },
  { kind: 'noTradesAfter', label: 'No new trades from a time of day' },
  { kind: 'maxRiskMultiple', label: 'Skip trades risking more than my usual' },
  { kind: 'skipSegment', label: 'Skip one group of trades' },
];

const SKIPPABLE: Dimension[] = ['symbol', 'setup', 'session', 'direction', 'weekday', 'hour', 'tradeNumber', 'marketCondition', 'tag', 'expiryDay'];

function ruleOf(kind: Kind, n: string, time: string, multiple: string, dim: Dimension, key: string): WhatIfRule | null {
  if (kind === 'stopAfterLosses' || kind === 'maxTradesPerDay') {
    const v = Number(n);
    return Number.isInteger(v) && v >= 1 && v <= 100 ? { kind, n: v } : null;
  }
  if (kind === 'noTradesAfter') return /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? { kind, time } : null;
  if (kind === 'maxRiskMultiple') {
    const v = Number(multiple);
    return Number.isFinite(v) && v >= 1 && v <= 100 ? { kind, multiple: v } : null;
  }
  return key ? { kind, dimension: dim, key } : null;
}

function ruleText(r: WhatIfRule, a: Analysis): string {
  switch (r.kind) {
    case 'stopAfterLosses': return `Stop for the day after ${plural(r.n, 'losing trade')}`;
    case 'maxTradesPerDay': return `At most ${plural(r.n, 'trade')} a day`;
    case 'noTradesAfter': return `No new trades from ${r.time} (${a.period.timeZone})`;
    case 'maxRiskMultiple': return `Skip trades risking more than ${r.multiple}× the median`;
    case 'skipSegment': return `Skip ${a.segments[r.dimension]?.find((s) => s.key === r.key)?.name ?? r.key} (${DIMENSION_LABEL[r.dimension].toLowerCase()})`;
  }
}

/** Replays the period without the trades a rule would have blocked (POST /analysis/what-if). */
export function WhatIfPanel({ state, currency }: { state?: AnalysisState; currency?: string }) {
  return (
    <AnalysisPanel
      title="What if I had followed a rule?"
      description="The period replayed without the trades the rule would have blocked. It removes trades that happened; it predicts nothing."
      state={state}
      loadingHeight="h-32"
      what="the replay"
    >
      {(a) => <WhatIfForm a={a} state={state!} currency={currency} />}
    </AnalysisPanel>
  );
}

function WhatIfForm({ a, state, currency }: { a: Analysis; state: AnalysisState; currency?: string }) {
  const [kind, setKind] = useState<Kind>('stopAfterLosses');
  const [n, setN] = useState('2');
  const [time, setTime] = useState('20:00');
  const [multiple, setMultiple] = useState('1.5');
  const dims = useMemo(() => SKIPPABLE.filter((d) => (a.segments[d]?.length ?? 0) > 0), [a]);
  const [dim, setDim] = useState<Dimension>(dims[0] ?? 'symbol');
  const keys = a.segments[dim] ?? [];
  const [key, setKey] = useState(keys[0]?.key ?? '');
  const [run, result] = useWhatIfMutation();
  const open = useOpenTrades();

  useEffect(() => {
    if (!keys.some((s) => s.key === key)) setKey(keys[0]?.key ?? '');
  }, [dim, keys, key]);

  const rule = ruleOf(kind, n, time, multiple, dim, key);
  const [asked, setAsked] = useState<WhatIfRule | null>(null);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rule) return;
    setAsked(rule);
    void run({ ...state.scope, rule });
  };
  const r = result.data;
  const diff = r ? r.replayNet - r.actualNet : 0;

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3" aria-label="What-if rule">
        <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-xs text-muted-foreground sm:flex-none">
          Rule
          <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
            <SelectTrigger aria-label="Rule" className="h-8 text-[13px] text-foreground"><SelectValue /></SelectTrigger>
            <SelectContent>
              {KINDS.filter((k) => k.kind !== 'skipSegment' || dims.length > 0).map((k) => <SelectItem key={k.kind} value={k.kind}>{k.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </label>
        {(kind === 'stopAfterLosses' || kind === 'maxTradesPerDay') && (
          <label className="flex w-28 flex-col gap-1 text-xs text-muted-foreground">
            {kind === 'stopAfterLosses' ? 'Losing trades' : 'Trades a day'}
            <Input type="number" inputMode="numeric" min={1} max={100} step={1} value={n} onChange={(e) => setN(e.target.value)} className="h-8 text-[13px]" />
          </label>
        )}
        {kind === 'noTradesAfter' && (
          <label className="flex w-32 flex-col gap-1 text-xs text-muted-foreground">
            From ({a.period.timeZone})
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-8 text-[13px]" />
          </label>
        )}
        {kind === 'maxRiskMultiple' && (
          <label className="flex w-36 flex-col gap-1 text-xs text-muted-foreground">
            × the median risk
            <Input type="number" inputMode="decimal" min={1} max={100} step={0.5} value={multiple} onChange={(e) => setMultiple(e.target.value)} className="h-8 text-[13px]" />
          </label>
        )}
        {kind === 'skipSegment' && (
          <>
            <label className="flex w-44 flex-col gap-1 text-xs text-muted-foreground">
              Group
              <Select value={dim} onValueChange={(v) => setDim(v as Dimension)}>
                <SelectTrigger aria-label="Group" className="h-8 text-[13px] text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent>{dims.map((d) => <SelectItem key={d} value={d}>{DIMENSION_LABEL[d]}</SelectItem>)}</SelectContent>
              </Select>
            </label>
            <label className="flex w-48 flex-col gap-1 text-xs text-muted-foreground">
              Value
              <Select value={key} onValueChange={setKey}>
                <SelectTrigger aria-label="Value" className="h-8 text-[13px] text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent>{keys.map((s) => <SelectItem key={s.key} value={s.key}>{s.name} · {plural(s.trades, 'trade')}</SelectItem>)}</SelectContent>
              </Select>
            </label>
          </>
        )}
        <Button type="submit" size="sm" disabled={!rule || result.isLoading}>{result.isLoading ? 'Replaying…' : 'Replay'}</Button>
      </form>
      {!rule && <p className="text-xs text-error" role="alert">Enter a whole number from 1 to 100, a time such as 20:00, or a multiple from 1 to 100.</p>}

      <div aria-live="polite" className="min-h-[5.5rem]">
        {result.isError ? (
          <ErrorState title="Couldn't replay the period." error={result.error} onRetry={() => asked && void run({ ...state.scope, rule: asked })} />
        ) : r && asked ? (
          <div className="space-y-2">
            <p className="text-[13px] font-medium">{ruleText(asked, a)}</p>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div><dt className="text-xs text-muted-foreground">Actual net</dt><dd><Money value={r.actualNet} currency={currency} className="text-lg" /></dd></div>
              <div><dt className="text-xs text-muted-foreground">Replayed net</dt><dd><Money value={r.replayNet} currency={currency} className="text-lg" /></dd></div>
              <div><dt className="text-xs text-muted-foreground">Trades not taken</dt><dd className="font-mono text-lg tabular-nums">{r.removed} <span className="text-xs text-muted-foreground">of {a.tradeCount}</span></dd></div>
              <div><dt className="text-xs text-muted-foreground">Average R</dt><dd className="font-mono text-lg tabular-nums">{formatR(r.replayAvgR)} <span className="text-xs text-muted-foreground">vs {formatR(r.actualAvgR)}</span></dd></div>
            </dl>
            <p className={cn('text-xs text-muted-foreground')}>
              {r.removed === 0
                ? 'The rule would not have blocked any trade in this period.'
                : `Without those ${plural(r.removed, 'trade')} the period would have ended ${formatMoney(Math.abs(diff), currency)} ${diff >= 0 ? 'higher' : 'lower'}.`}
            </p>
            {r.removedTradeIds.length > 0 && <Button type="button" variant="outline" size="sm" onClick={() => open(r.removedTradeIds)}>Open the {plural(r.removedTradeIds.length, 'trade')} not taken</Button>}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Pick a rule and press Replay. <MetricInfo metric="whatIf" label="How the replay works" /></p>
        )}
      </div>
    </div>
  );
}
