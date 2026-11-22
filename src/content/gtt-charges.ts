/**
 * GTT (good till triggered) terms for /blog/gtt-order-charges, one row per broker. Every cell is copied from the
 * broker's own pages listed in the same row and names the source ids it came from; a question those pages do not
 * answer is NOT_STATED, never filled from a comparison site.
 */

export const GTT_CHECKED = '2026-11-21';
export const NOT_STATED = 'Not stated on the broker’s page';

export type GttBrokerId = 'zerodha' | 'groww' | 'upstox' | 'angel-one' | 'kotak-neo' | 'icici-direct' | 'fyers' | 'mstock' | 'dhan' | '5paisa';

export interface GttSource {
  id: string;
  /** Full title for the Sources list. */
  label: string;
  /** One or two words for the link inside the table. */
  short: string;
  url: string;
  /** YYYY-MM-DD the page was read. */
  checked: string;
}

export interface GttCell {
  text: string;
  /** Ids of this row's sources that state it; empty only when text is NOT_STATED. */
  from: string[];
}

export interface GttBroker {
  id: GttBrokerId;
  broker: string;
  /** Every source URL sits on this host or a subdomain of it. */
  domain: string;
  /** The broker's own name for the feature. */
  feature: string;
  placing: GttCell;
  onExecution: GttCell;
  validity: GttCell;
  availability: GttCell;
  orderTypes: GttCell;
  activeCap: GttCell;
  corporateAction: GttCell;
  /** Where the broker's own pages disagree or are dated. */
  note?: GttCell;
  sources: GttSource[];
}

const cell = (text: string, ...from: string[]): GttCell => ({ text, from });
const none: GttCell = { text: NOT_STATED, from: [] };
const src = (id: string, short: string, label: string, url: string): GttSource => ({ id, short, label, url, checked: GTT_CHECKED });

export const GTT_BROKERS: GttBroker[] = [
  {
    id: 'zerodha',
    broker: 'Zerodha',
    domain: 'zerodha.com',
    feature: 'GTT',
    placing: cell('Free', 'help', 'terms'),
    onExecution: cell('Normal brokerage on the order once the GTT triggers', 'terms'),
    validity: cell('1 year; F&O until the contract expires', 'validity', 'fno'),
    availability: cell('Equity CNC and MTF on NSE and BSE; NRML in NSE and BSE F&O and MCX; not currency', 'terms', 'fno'),
    orderTypes: cell('Single, OCO, trailing stop-loss', 'help'),
    activeCap: cell('500 active', 'help', 'terms'),
    corporateAction: cell(
      'May be cancelled on the ex-date for splits, bonuses, dividends above 2% of the price, mergers, rights issues and similar; notice one day before',
      'terms',
    ),
    sources: [
      src('help', 'GTT help', 'Zerodha: What is a Good Till Triggered (GTT) order, and how to place one on Kite?', 'https://support.zerodha.com/category/trading-and-markets/charts-and-orders/gtt/articles/what-is-the-good-till-triggered-gtt-feature'),
      src('validity', 'validity', 'Zerodha: What is the validity of a GTT order?', 'https://support.zerodha.com/category/trading-and-markets/charts-and-orders/gtt/articles/what-is-the-validity-of-a-gtt-order'),
      src('fno', 'F&O', 'Zerodha: Are GTT orders available for futures and options (F&O) contracts?', 'https://support.zerodha.com/category/trading-and-markets/charts-and-orders/gtt/articles/gtt-fno'),
      src('terms', 'terms', 'Zerodha: GTT terms and conditions', 'https://zerodha.com/tos/gtt/'),
    ],
  },
  {
    id: 'groww',
    broker: 'Groww',
    domain: 'groww.in',
    feature: 'GTT',
    placing: cell('No extra charge', 'charges'),
    onExecution: cell('As for a regular order: brokerage, statutory and regulatory charges, DP charges on sells, GST', 'charges'),
    validity: cell('Up to 1 year for stocks; F&O until the contract expires', 'validity'),
    availability: cell('Stocks and F&O contracts, from the delivery option', 'place'),
    orderTypes: none,
    activeCap: cell('200', 'cap'),
    corporateAction: cell('All GTTs on the stock are cancelled after a corporate action such as a dividend, split or bonus', 'status'),
    sources: [
      src('charges', 'charges', 'Groww: What are the extra charges levied for a GTT order?', 'https://groww.in/help/stocks,-f&o,-ipo-&-mtf/sx-dashboard/what-are-the-extra-charges-levied-for-an-gtt-order---46'),
      src('validity', 'validity', 'Groww: What is the validity of a GTT order?', 'https://groww.in/help/stocks,-f&o,-ipo-&-mtf/order/what-is-the-validity-of-a-gtt-order--38'),
      src('place', 'placing', 'Groww: How can I place a GTT order?', 'https://groww.in/help/stocks,-f&o,-ipo-&-mtf/sx-dashboard/how-to-place-a-gtt-order---66'),
      src('cap', 'limit', 'Groww: How many active GTT orders can I place simultaneously?', 'https://groww.in/help/stocks,-f&o,-ipo-&-mtf/sx-dashboard/how-many-active-gtt-orders-can-i-place-simultaneously---41'),
      src('status', 'cancellations', 'Groww: What happened to my GTT order?', 'https://groww.in/help/stocks,-f&o,-ipo-&-mtf/order/what-happened-to-my-gtt-order--63'),
    ],
  },
  {
    id: 'upstox',
    broker: 'Upstox',
    domain: 'upstox.com',
    feature: 'GTT',
    placing: cell('No extra charge', 'charges', 'policy'),
    onExecution: cell('Standard brokerage, transaction charges, STT, GST and other regulatory charges', 'charges'),
    validity: cell('365 days or contract expiry, whichever is earlier; an intraday GTT ends with the session', 'policy', 'validity'),
    availability: cell('Equity and F&O on NSE, BSE and MCX; intraday: Upstox pages disagree (see notes)', 'policy', 'validity', 'segments'),
    orderTypes: cell('Entry with optional stop-loss and target; trailing stop-loss', 'policy'),
    activeCap: cell('100 pending', 'policy'),
    corporateAction: cell(
      'Cancelled 1 day before the ex-date when the price impact is significant, including dividends above 5% of the price',
      'policy',
    ),
    note: cell(
      'Upstox: its GTT policy says GTT can be set for intraday and delivery, and its validity page describes intraday GTTs ending at about 3:15 PM, but its segments page says GTT does not apply to intraday.',
      'policy',
      'validity',
      'segments',
    ),
    sources: [
      src('charges', 'charges', 'Upstox: Are additional charges applicable on Good Till Triggered (GTT) orders?', 'https://upstox.com/help-center/t-253093/'),
      src('validity', 'validity', 'Upstox: What is the validity of a GTT order?', 'https://upstox.com/help-center/t-253088/'),
      src('segments', 'segments', 'Upstox: In which segments can a Good Till Triggered (GTT) order be placed?', 'https://upstox.com/help-center/in-which-segments-can-a-good-till-triggered-gtt-order-be-placed-253081/'),
      src('policy', 'GTT policy', 'Upstox: GTT policy cum terms and conditions (PDF)', 'https://assets.upstox.com/website/forms/gtt-policy.pdf'),
    ],
  },
  {
    id: 'angel-one',
    broker: 'Angel One',
    domain: 'angelone.in',
    feature: 'GTT',
    placing: cell('Usually none: “does not usually involve any separate charges”', 'guide'),
    onExecution: cell('Standard brokerage, taxes and statutory charges “may apply” once it triggers and executes', 'guide'),
    validity: cell('365 calendar days; derivatives until the contract expires', 'terms'),
    availability: cell(
      'Equity delivery and margin on NSE and BSE; carry-forward in equity, commodity and currency derivatives; not intraday',
      'terms',
      'faq',
    ),
    orderTypes: cell('Limit orders only', 'terms'),
    activeCap: cell('50 pending', 'terms'),
    corporateAction: cell('Cancelled one day before the ex-date when the price impact is significant', 'terms'),
    sources: [
      src('terms', 'terms', 'Angel One: GTT terms and conditions', 'https://www.angelone.in/gtt-terms-and-condition'),
      src('guide', 'charges', 'Angel One: Good Till Trigger (GTT): new tool for investors (“Is GTT order chargeable?”)', 'https://www.angelone.in/knowledge-center/share-market/good-till-trigger-new-tool-for-investors'),
      src('faq', 'order FAQ', 'Angel One: Types of orders (“Can I place an Intraday Order using GTT?”)', 'https://www.angelone.in/support/your-orders/types-of-orders'),
    ],
  },
  {
    id: 'kotak-neo',
    broker: 'Kotak Neo',
    domain: 'kotakneo.com',
    feature: 'GTT',
    placing: none,
    onExecution: cell(
      'Your plan’s brokerage, no ₹49 minimum; a dealer-placed GTT executed from T+1 pays at least ₹10 (from 18 Apr 2026)',
      'brokerage',
    ),
    validity: cell('1 year for equities; derivatives until the contract expires', 'guide', 'help'),
    availability: cell('Equity cash on NSE and BSE, F&O (NRML) and Pay Later (MTF)', 'help', 'guide'),
    orderTypes: cell('Single and OCO', 'guide'),
    activeCap: cell('5,000 active', 'guide'),
    corporateAction: cell('Splits or bonuses can cancel a GTT automatically', 'guide'),
    note: cell(
      'Kotak Neo: the first answer on its GTT brokerage page reads as a general ₹10 minimum; the answers below it limit the ₹10 minimum to GTTs placed by a dealer and executed from T+1, and say a GTT executed on the day it is placed pays plan brokerage without the minimum.',
      'brokerage',
    ),
    sources: [
      src('brokerage', 'brokerage', 'Kotak Neo: Are there any changes in the brokerage charges for Good-Till-Triggered (GTT) orders?', 'https://www.kotakneo.com/support/what-are-the-brokerage-charges-for-gtt-orders/'),
      src('help', 'GTT help', 'Kotak Neo: What is a GTT order? How does it work?', 'https://www.kotakneo.com/support/what-is-a-gtt-order-how-does-it-work/'),
      src('guide', 'guide', 'Kotak Neo investing guide: GTT, what is Good Till Triggered in stock trading?', 'https://www.kotakneo.com/investing-guide/share-market/gtt-order-in-stock-trading/'),
    ],
  },
  {
    id: 'icici-direct',
    broker: 'ICICI Direct',
    domain: 'icicidirect.com',
    feature: 'GTT',
    placing: cell('Typically none: “typically no additional charges”', 'charges'),
    onExecution: cell('Standard trading fees once it executes', 'charges'),
    validity: cell('365 days for stocks; F&O until the contract expires', 'validity', 'fnoValidity'),
    availability: cell('Stocks and F&O; not intraday', 'validity', 'fnoValidity', 'intraday'),
    orderTypes: cell('Single and OCO', 'oco'),
    activeCap: cell('300 in equity, active and inactive (an OCO counts as two)', 'cap'),
    corporateAction: cell(
      'Cancelled 2 days before the ex-date when the price impact is significant, including dividends above 5% of the price; email sent',
      'policy',
    ),
    sources: [
      src('charges', 'charges', 'ICICI Direct: Are there any charges associated with GTT orders?', 'https://www.icicidirect.com/faqs/fno/are-there-any-charges-associated-with-gtt-orders'),
      src('validity', 'validity', 'ICICI Direct: What is the validity of GTT order?', 'https://www.icicidirect.com/faqs/stocks/what-is-the-validity-of-gtt-request'),
      src('fnoValidity', 'F&O validity', 'ICICI Direct: What will be the validity of GTT request? (F&O)', 'https://www.icicidirect.com/faqs/fno/what-will-be-the-validity-of-gtt-requestt'),
      src('intraday', 'intraday', 'ICICI Direct: Can I place a GTT order for intraday trading?', 'https://www.icicidirect.com/faqs/fno/can-i-place-a-gtt-order-for-intraday-trading'),
      src('oco', 'OCO', 'ICICI Direct: What is an OCO request in GTT?', 'https://www.icicidirect.com/faqs/stocks/what-is-oco-request-in-gtt'),
      src('cap', 'limit', 'ICICI Direct: What are the maximum number of GTT orders that can be placed in Equity?', 'https://www.icicidirect.com/faqs/stocks/what-are-the-maximum-number-of-gtt-orders-that-can-be-placed-in-equity'),
      src('policy', 'GTT policy', 'ICICI Securities: Good till Triggered policy (PDF)', 'https://www.icicidirect.com/content/images/gtt_policy_final.pdf'),
    ],
  },
  {
    id: 'fyers',
    broker: 'Fyers',
    domain: 'fyers.in',
    feature: 'GTT',
    placing: cell('None, before or after it triggers', 'community'),
    onExecution: cell('Standard brokerage and statutory charges, as on a regular order', 'community'),
    validity: cell('365 days for equity; F&O until the contract expires', 'terms', 'validity'),
    availability: cell('Equity delivery/overnight and MTF; F&O; not intraday', 'place', 'terms'),
    orderTypes: cell('Single and OCO', 'place'),
    activeCap: none,
    corporateAction: cell('Cancelled before the ex-date for any corporate action, such as a dividend, merger or split', 'terms'),
    note: cell(
      'Fyers: the charge cells come from a FYERS Team reply on the FYERS Community forum (June 2025); its help centre articles on GTT do not mention charges.',
      'community',
    ),
    sources: [
      src('terms', 'terms', 'FYERS: What are the terms and conditions for placing a GTT order on FYERS?', 'https://support.fyers.in/portal/en/kb/articles/what-are-the-terms-and-conditions-for-placing-a-gtt-order-on-fyers'),
      src('validity', 'validity', 'FYERS: How long are orders valid in FYERS? (Day, IOC, GTT, Smart orders)', 'https://support.fyers.in/portal/en/kb/articles/how-long-are-orders-valid-in-fyers-day-ioc-gtt-smart-orders'),
      src('place', 'placing', 'FYERS: How to place a GTT order in FYERS?', 'https://support.fyers.in/portal/en/kb/articles/how-to-place-a-gtt-order-in-fyers'),
      src('community', 'charges', 'FYERS Community: GTT order charge (FYERS Team reply, June 2025)', 'https://fyers.in/community/t/gtt-order-charge/21927'),
    ],
  },
  {
    id: 'mstock',
    broker: 'mStock',
    domain: 'mstock.com',
    feature: 'GTT',
    placing: cell('Free', 'article'),
    onExecution: cell('Brokerage', 'article'),
    validity: cell('365 days for equity; once triggered, that trading day only', 'article'),
    availability: cell('Equity (July 2024 article; see notes)', 'article'),
    orderTypes: cell('Single; OCO “will be added shortly” (July 2024)', 'article'),
    activeCap: cell('50 active', 'article'),
    corporateAction: cell('Good Till Date policy: cancelled on the ex-date if the price moves more than 5% from the previous close', 'policy'),
    note: cell(
      'mStock: its only GTT help page found is an article dated 26 Jul 2024, which says F&O and currency GTTs were “available soon”. Its Good Till Date policy of 28 Nov 2024, for orders re-placed every trading day until a date you choose (which mStock also abbreviates GTT), lists equity cash, futures and options.',
      'article',
      'policy',
    ),
    sources: [
      src('article', 'GTT article', 'mStock: GTT orders on m.Stock (26 Jul 2024)', 'https://www.mstock.com/articles/gtt-orders-on-mstock'),
      src('policy', 'GTD policy', 'Mirae Asset Capital Markets: Policy for handling Good Till Date orders (PDF, 28 Nov 2024)', 'https://www.mstock.com/Content/pdf/Good-Till-Date-Policy.pdf'),
    ],
  },
  {
    id: 'dhan',
    broker: 'Dhan',
    domain: 'dhan.co',
    feature: 'Forever Order',
    placing: none,
    onExecution: none,
    validity: cell('Until it triggers, up to 365 days; an intraday order ends with the day', 'help', 'policy'),
    availability: cell('All product types, exchanges and segments, “subject to availability”; equity sells need DDPI', 'policy'),
    orderTypes: cell('Single and OCO', 'oco'),
    activeCap: none,
    corporateAction: cell('All active orders on the stock are cancelled after a split, bonus or other price adjustment; notice at least two days before the ex-date', 'policy'),
    sources: [
      src('help', 'Forever Order', 'Dhan: What is Forever Order on Dhan? Can we place GTT on Dhan?', 'https://dhan.co/support/orders-and-positions/order-types/what-is-forever-order-on-dhan-can-we-place-gtt-on-dhan/'),
      src('oco', 'OCO', 'Dhan: What is OCO? Can we place stop loss and target together for positional trades?', 'https://dhan.co/support/orders-and-positions/order-types/what-is-oco-can-we-place-stop-loss-and-target-together-for-positional-trades/'),
      src('policy', 'policy', 'Dhan: Policy on handling of Good Till Cancelled orders of the clients (PDF)', 'https://dhan.co/regulatory-and-other-information-pdf/Policy-of-Handling-Good-Till-Cancelled-Orders-of-Clients.pdf'),
    ],
  },
  {
    id: '5paisa',
    broker: '5paisa',
    domain: '5paisa.com',
    feature: 'VTT (Valid Till Triggered)',
    placing: none,
    onExecution: none,
    validity: cell('Up to a year', 'fno360'),
    availability: none,
    orderTypes: none,
    activeCap: none,
    corporateAction: cell(
      'Pending VTT orders hit by a split, bonus, rights issue, merger, demerger or similar are cancelled; notice at least one trading day before the ex-date',
      'policy',
    ),
    sources: [
      src('fno360', 'FnO 360', '5paisa: Beginner’s guide to derivatives trading with FnO 360 (“VTT Orders”)', 'https://www.5paisa.com/blog/beginners-guide-to-derivatives-trading-with-fo-360'),
      src('policy', 'VTT policy', '5paisa: Policy on handling Valid Till Triggered (VTT) and Valid Till Date (VTD) orders', 'https://www.5paisa.com/good-till-date-policy'),
    ],
  },
];

/** The fields the tables show, in order, for checks that walk every cell. */
export const GTT_FIELDS = ['placing', 'onExecution', 'validity', 'availability', 'orderTypes', 'activeCap', 'corporateAction'] as const;
