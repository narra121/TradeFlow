import type { AssetClass, Trade, TradeDirection, TradeImage, TradeOutcome } from '@/types/trade';
import { defaultLotSize, inferAssetClass } from '@/lib/tradePreview';

export interface TradeFormState {
  accountIds: string[];
  assetClass: AssetClass;
  symbol: string;
  direction: TradeDirection;
  optionType: 'call' | 'put' | '';
  strike: string;
  expiry: string;
  lotSize: string;
  entryPrice: string;
  stopLoss: string;
  takeProfit: string;
  exitPrice: string;
  quantity: string;
  entryTime: string;
  exitTime: string;
  fees: string;
  /** Net P&L typed by the user; empty while the value follows the automatic calculation. */
  manualPnl: string;
  outcome: TradeOutcome;
  outcomeTouched: boolean;
  strategy: string;
  session: string;
  marketCondition: string;
  newsEvent: string;
  mistakes: string[];
  tags: string[];
  /** The trade had no asset class; it was guessed from the symbol and the form says so. */
  assetClassInferred?: boolean;
  brokenRuleIds: string[];
  keyLesson: string;
  notes: string;
  images: TradeImage[];
}

/** `YYYY-MM-DDTHH:mm` in local time, the value format of <input type="datetime-local">. */
export function toLocalInput(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function fromLocalInput(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseNum(value: string): number | null {
  const t = value.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

const str = (n: number | undefined | null) => (n === undefined || n === null || Number.isNaN(n) || n === 0 ? '' : String(n));

export interface NewFormDefaults {
  accountIds: string[];
  assetClass?: AssetClass;
  /** `YYYY-MM-DD`: prefilled trade day. */
  date?: string | null;
  /** Duplicate source: copies account, class, symbol, direction, quantity, stop / target distance, strategy, session. */
  from?: Trade | null;
}

export function emptyForm(d: NewFormDefaults): TradeFormState {
  const assetClass: AssetClass = d.from?.assetClass ?? d.assetClass ?? 'forex';
  const day = d.date ? new Date(`${d.date}T00:00`) : new Date();
  const entry = new Date(day);
  const base: TradeFormState = {
    accountIds: d.accountIds,
    assetClass,
    symbol: '',
    direction: 'LONG',
    optionType: '',
    strike: '',
    expiry: '',
    lotSize: String(defaultLotSize(assetClass) ?? ''),
    entryPrice: '',
    stopLoss: '',
    takeProfit: '',
    exitPrice: '',
    quantity: '',
    entryTime: d.date ? toLocalInput(entry) : '',
    exitTime: d.date ? '' : toLocalInput(new Date()),
    fees: '',
    manualPnl: '',
    outcome: 'TP',
    outcomeTouched: false,
    strategy: '',
    session: '',
    marketCondition: '',
    newsEvent: '',
    mistakes: [],
    tags: [],
    brokenRuleIds: [],
    keyLesson: '',
    notes: '',
    images: [],
  };
  const src = d.from;
  if (!src) return base;
  return {
    ...base,
    accountIds: src.accountId ? [src.accountId] : d.accountIds,
    symbol: src.symbol,
    direction: src.direction,
    quantity: str(src.size),
    lotSize: str(src.contractMultiplier) || base.lotSize,
    strategy: src.strategy ?? src.setup ?? '',
    session: src.session ?? '',
  };
}

export function formFromTrade(t: Trade): TradeFormState {
  const assetClass: AssetClass = t.assetClass ?? inferAssetClass(t.symbol ?? '');
  return {
    ...(t.assetClass ? {} : { assetClassInferred: true }),
    accountIds: t.accountId ? [t.accountId] : [],
    assetClass,
    symbol: t.symbol ?? '',
    direction: t.direction,
    optionType: t.optionType ?? '',
    strike: str(t.strike),
    expiry: t.expiry ?? '',
    lotSize: str(t.contractMultiplier) || String(defaultLotSize(assetClass) ?? ''),
    entryPrice: str(t.entryPrice),
    stopLoss: str(t.stopLoss),
    takeProfit: str(t.takeProfit),
    exitPrice: str(t.exitPrice),
    quantity: str(t.size),
    entryTime: toLocalInput(t.entryDate),
    exitTime: toLocalInput(t.exitDate),
    fees: str(t.fees),
    // The stored value is kept as typed, never recalculated on edit.
    manualPnl: String(t.pnl ?? 0),
    outcome: t.outcome ?? 'TP',
    outcomeTouched: true,
    strategy: t.strategy ?? t.setup ?? '',
    session: t.session ?? '',
    marketCondition: t.marketCondition ?? '',
    newsEvent: t.newsEvents?.[0] ?? '',
    mistakes: t.mistakes ?? [],
    tags: t.tags ?? [],
    brokenRuleIds: t.brokenRuleIds ?? [],
    keyLesson: t.keyLesson ?? '',
    notes: t.notes ?? '',
    images: (t.images ?? []).map((img, i) => ({ id: img.id || String(i), timeframe: img.timeframe || '1H', description: img.description || '' })),
  };
}

export type FormErrors = Partial<Record<keyof TradeFormState | 'form', string>>;

export function validateForm(f: TradeFormState, ctx: { hasAccounts: boolean; pnlAvailable: boolean; now?: Date }): FormErrors {
  const e: FormErrors = {};
  if (ctx.hasAccounts && f.accountIds.length === 0) e.accountIds = 'Choose at least one account.';
  if (!f.symbol.trim()) e.symbol = 'Symbol is required.';
  const entry = parseNum(f.entryPrice);
  const exit = parseNum(f.exitPrice);
  const qty = parseNum(f.quantity);
  if (entry === null || entry <= 0) e.entryPrice = 'Enter a price above 0.';
  if (exit === null || exit < 0) e.exitPrice = 'Enter the exit price.';
  else if (exit === 0) e.exitPrice = 'Exit price cannot be 0.';
  if (qty === null || qty <= 0) e.quantity = 'Enter a quantity above 0.';
  for (const k of ['stopLoss', 'takeProfit', 'fees'] as const) {
    const v = f[k].trim();
    if (v !== '' && parseNum(v) === null) e[k] = 'Enter a number.';
    else if (v !== '' && k !== 'fees' && (parseNum(v) as number) < 0) e[k] = 'Cannot be negative.';
  }
  const entryT = fromLocalInput(f.entryTime);
  const exitT = fromLocalInput(f.exitTime);
  if (!entryT) e.entryTime = 'Enter the open time.';
  if (!exitT) e.exitTime = 'Enter the close time.';
  else if (entryT && exitT.getTime() < entryT.getTime()) e.exitTime = 'Close time is before the open time.';
  if (f.assetClass === 'options') {
    if (!f.optionType) e.optionType = 'Choose Call or Put.';
    if (parseNum(f.strike) === null) e.strike = 'Enter the strike.';
    if (!f.expiry) e.expiry = 'Enter the expiry date.';
  }
  if (!ctx.pnlAvailable) e.manualPnl = 'Enter the net P&L.';
  return e;
}
