import type { AssetClass, Trade, TradeDirection, TradeImage, TradeOutcome } from '@/types/trade';
import { fromZonedInput, toZonedInput } from '@/lib/appTimeZone';
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

/** `YYYY-MM-DDTHH:mm` on the app time zone's clock (Settings), the value format of <input type="datetime-local">. */
export const toLocalInput = toZonedInput;

export function fromLocalInput(value: string): Date | null {
  return value ? fromZonedInput(value) : null;
}

/** Plain digits with an optional decimal part, or comma-grouped thousands ("1,234.50"); "1,5" is ambiguous and rejected. */
const NUMBER_TEXT = /^[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)?(?:\.\d*)?$/;

/** `null` for empty text and for anything that is not a number; the Unicode minus (U+2212) counts as "-". */
export function parseNum(value: string): number | null {
  const t = value.trim().replace(/\u2212/g, '-');
  if (!NUMBER_TEXT.test(t) || !/\d/.test(t)) return null;
  const n = Number(t.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

const str = (n: number | undefined | null) => (n === undefined || n === null || Number.isNaN(n) || n === 0 ? '' : String(n));
/** Like `str`, but a stored 0 stays "0": an option can expire worthless. */
const strKeepZero = (n: number | undefined | null) => (n === undefined || n === null || Number.isNaN(n) ? '' : String(n));

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
    // Form values are wall-clock text on the app zone's clock, so the prefilled day's midnight is written as is.
    entryTime: d.date ? `${d.date}T00:00` : '',
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
    exitPrice: strKeepZero(t.exitPrice),
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

/** Longest values the API accepts (JournalAWSSetup src/schemas/trade-create.schema.json). */
export const LIMITS = { notes: 4000, keyLesson: 256, strategy: 64, session: 32, marketCondition: 64, newsEvent: 128, mistake: 64, tag: 24, tags: 10, accountIds: 10, imageDescription: 256 } as const;

/** What the dirty check compares for screenshots: new ones are large data, so only id, timeframe and description count. */
export const imagesKey = (images: TradeImage[]) => images.map((i) => `${i.id}|${i.timeframe}|${i.description}`).join('\n');

/** API field name (create/update body) -> the form field that shows its error. */
const SERVER_FIELD: Record<string, keyof TradeFormState> = {
  symbol: 'symbol', side: 'direction', quantity: 'quantity', entryPrice: 'entryPrice', exitPrice: 'exitPrice', stopLoss: 'stopLoss', takeProfit: 'takeProfit',
  openDate: 'entryTime', closeDate: 'exitTime', pnl: 'manualPnl', fees: 'fees', contractMultiplier: 'lotSize', setupType: 'strategy', tradingSession: 'session',
  marketCondition: 'marketCondition', tradeNotes: 'notes', lessons: 'keyLesson', newsEvents: 'newsEvent', mistakes: 'mistakes', tags: 'tags', accountIds: 'accountIds',
  brokenRuleIds: 'brokenRuleIds', images: 'images', optionType: 'optionType', strike: 'strike', expiry: 'expiry',
};

/** Field errors of a 400 (`error.fields`: `[{ field, message }]`) placed on the form fields they belong to. */
export function serverFieldErrors(err: unknown): FormErrors {
  const fields = (err as { data?: { error?: { fields?: unknown } } } | null)?.data?.error?.fields;
  const out: FormErrors = {};
  if (!Array.isArray(fields)) return out;
  for (const item of fields as { field?: unknown; message?: unknown }[]) {
    const key = SERVER_FIELD[String(item?.field ?? '').split('.')[0]];
    if (key && typeof item.message === 'string' && !out[key]) out[key] = item.message;
  }
  return out;
}

export function validateForm(f: TradeFormState, ctx: { hasAccounts: boolean; pnlAvailable: boolean; now?: Date }): FormErrors {
  const e: FormErrors = {};
  if (ctx.hasAccounts && f.accountIds.length === 0) e.accountIds = 'Choose at least one account.';
  if (!f.symbol.trim()) e.symbol = 'Symbol is required.';
  const entry = parseNum(f.entryPrice);
  const exit = parseNum(f.exitPrice);
  const qty = parseNum(f.quantity);
  if (entry === null || entry <= 0) e.entryPrice = 'Enter a price above 0.';
  if (exit === null || exit < 0) e.exitPrice = 'Enter the exit price.';
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
  const tooLong = (key: 'notes' | 'keyLesson' | 'strategy' | 'session' | 'marketCondition' | 'newsEvent', label: string) => {
    if (f[key].length > LIMITS[key]) e[key] = `${label} can have at most ${LIMITS[key]} characters.`;
  };
  tooLong('notes', 'Notes');
  tooLong('keyLesson', 'Key lesson');
  tooLong('strategy', 'Strategy');
  tooLong('session', 'Session');
  tooLong('marketCondition', 'Market condition');
  tooLong('newsEvent', 'News event');
  if (f.mistakes.some((m) => m.length > LIMITS.mistake)) e.mistakes = `A mistake can have at most ${LIMITS.mistake} characters.`;
  if (f.tags.length > LIMITS.tags) e.tags = `A trade can have at most ${LIMITS.tags} tags.`;
  else if (f.tags.some((t) => t.length > LIMITS.tag)) e.tags = `A tag can have at most ${LIMITS.tag} characters.`;
  if (f.accountIds.length > LIMITS.accountIds) e.accountIds = `Choose at most ${LIMITS.accountIds} accounts.`;
  if (f.manualPnl.trim() !== '' && parseNum(f.manualPnl) === null) e.manualPnl = 'Enter a number.';
  else if (!ctx.pnlAvailable) e.manualPnl = 'Enter the net P&L.';
  return e;
}
