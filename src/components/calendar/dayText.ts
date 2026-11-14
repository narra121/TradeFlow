import { formatLocalDateOnly } from '@/lib/dateUtils';
import { formatMoney } from '@/lib/format';
import type { CurrencyNet } from '@/lib/calendar';
import type { Trade } from '@/types/trade';

export function netText(list: CurrencyNet[]): string {
  return list.map((c) => formatMoney(c.net, c.currency, { sign: true })).join(' · ');
}

/** `2W 1L`; a side with none is left out so a zero is never read as the letter O. */
export function winLoss(wins: number, losses: number): string {
  return [wins ? `${wins}W` : '', losses ? `${losses}L` : ''].filter(Boolean).join(' ') || '0';
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;
}

/** Hours (0-23) a trade was open in on its opening day, from entry to exit; a trade without an exit time occupies its entry hour, one that closes on a later day runs to 23. */
export function hoursOpen(t: Trade): number[] {
  const start = new Date(t.entryDate);
  const end = new Date(t.exitDate || t.entryDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  const to = formatLocalDateOnly(start) === formatLocalDateOnly(end) ? end.getHours() : 23;
  const hours: number[] = [];
  for (let h = Math.min(start.getHours(), to); h <= Math.max(start.getHours(), to); h++) hours.push(h);
  return hours;
}
