import { PROFIT_FACTOR_SENTINEL, formatMoney } from '@/lib/format';

export type DeltaKind = 'money' | 'pts' | 'ratio' | 'r' | 'count';

export interface DeltaInput {
  kind: DeltaKind;
  current: number | null | undefined;
  previous: number | null | undefined;
  currency?: string;
  /** `Oct`, `last week`, `previous period`. */
  name: string;
  /** `October`; falls back to `name`. */
  spokenName?: string;
  /** Where the direction is ambiguous (drawdown, losses) the word `better` / `worse` is printed. */
  lowerIsBetter?: boolean;
}

export interface DeltaText {
  /** `▲ $320.00 vs Oct` */
  text: string;
  /** `up $320.00 versus October` */
  spoken: string;
  direction: 'up' | 'down' | 'flat';
}

const ok = (n: number | null | undefined): n is number => typeof n === 'number' && Number.isFinite(n);

/** Change against the previous period in words and an arrow; `null` when either side is missing (no `0` is invented). */
export function describeDelta(i: DeltaInput): DeltaText | null {
  if (!ok(i.current) || !ok(i.previous)) return null;
  if (i.kind === 'ratio' && (i.current >= PROFIT_FACTOR_SENTINEL || i.previous >= PROFIT_FACTOR_SENTINEL)) return null;
  const diff = i.current - i.previous;
  const abs = Math.abs(diff);
  const amount =
    i.kind === 'money' ? formatMoney(abs, i.currency, { decimals: 2 })
    : i.kind === 'pts' ? `${abs.toFixed(1)} pts`
    : i.kind === 'r' ? `${abs.toFixed(2)}R`
    : i.kind === 'count' ? String(Math.round(abs))
    : abs.toFixed(2);
  const zero = i.kind === 'money' ? Number(abs.toFixed(2)) === 0 : i.kind === 'count' ? Math.round(abs) === 0 : i.kind === 'pts' ? Number(abs.toFixed(1)) === 0 : Number(abs.toFixed(2)) === 0;
  const spokenName = i.spokenName ?? i.name;
  if (zero) return { text: `No change vs ${i.name}`, spoken: `unchanged versus ${spokenName}`, direction: 'flat' };
  const up = diff > 0;
  const word = i.lowerIsBetter === undefined ? '' : (up ? i.lowerIsBetter : !i.lowerIsBetter) ? 'worse' : 'better';
  return {
    text: `${up ? '▲' : '▼'} ${amount} vs ${i.name}${word ? ` · ${word}` : ''}`,
    spoken: `${up ? 'up' : 'down'} ${amount} versus ${spokenName}${word ? `, ${word}` : ''}`,
    direction: up ? 'up' : 'down',
  };
}
