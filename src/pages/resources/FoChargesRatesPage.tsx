import { useMemo, useState } from 'react';
import { ContentPageShell } from '@/components/content/ContentPageShell';
import {
  CalcLayout,
  DecimalInput,
  FormulaDisclosure,
  LiveResult,
  calcInputClass,
  calcLabelClass,
  parseDecimal,
} from '@/components/content/calculator';
import { A, Callout, Crumbs, Disclaimer, Faq, H2, P, ShortAnswer, SignupCta, Sources, Table, UL } from '@/content/components/ArticleParts';
import type { FaqItem } from '@/content/product-facts';
import { calculatorSchema } from '@/config/seo';
import { formatMoney } from '@/lib/format';
import {
  EXCHANGE_ROWS,
  GST_ROWS,
  RATES_CHECKED_ON,
  SEBI_ROWS,
  STAMP_ROWS,
  STT_ROWS,
  calculateCharges,
  formatPct,
  isIsoDate,
  rateChangesSince,
  type Leg,
  type Part,
  type PartKey,
  type RateSource,
} from '@/lib/charges/foRateHistory';

const PATH = '/resources/fo-charges-rates';
const NAME = 'F&O charges and STT rates by trade date';
const TITLE = 'F&O charges and STT rates by trade date | TradeQut';
const DESCRIPTION =
  'Estimate STT, NSE exchange charge, SEBI fee, stamp duty and GST on an F&O trade for its date, with the circular behind each rate. Estimate only.';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};
const todayIso = (): string => new Date().toLocaleDateString('en-CA');
const rupees = (n: number): string => formatMoney(n, 'INR', { decimals: 2 });
const CHECKED = fmtDate(RATES_CHECKED_ON);

const LEGS: { value: Leg; label: string; valueLabel: string; hint: string }[] = [
  { value: 'futures-buy', label: 'Futures, bought', valueLabel: 'Traded value (₹)', hint: 'Price × quantity for this leg.' },
  { value: 'futures-sell', label: 'Futures, sold', valueLabel: 'Traded value (₹)', hint: 'Price × quantity for this leg.' },
  { value: 'options-sell', label: 'Options, sold', valueLabel: 'Premium value (₹)', hint: 'Premium × quantity for this leg.' },
  { value: 'options-buy', label: 'Options, bought', valueLabel: 'Premium value (₹)', hint: 'Premium × quantity for this leg.' },
  {
    value: 'options-exercised',
    label: 'Options, exercised',
    valueLabel: 'Intrinsic value (₹)',
    hint: 'In-the-money amount per unit × quantity, as on your contract note. Only STT is calculated.',
  },
];

const PART_LABELS: Record<PartKey, string> = {
  stt: 'STT',
  exchange: 'NSE transaction charge',
  ipft: 'NSE IPFT contribution',
  sebi: 'SEBI turnover fee',
  stamp: 'Stamp duty',
  gst: 'GST',
};
const PART_ORDER: PartKey[] = ['stt', 'exchange', 'ipft', 'sebi', 'stamp', 'gst'];

const latestStt = STT_ROWS[STT_ROWS.length - 1];
const latestExchange = EXCHANGE_ROWS[EXCHANGE_ROWS.length - 1];
const firstStamp = STAMP_ROWS[0];
const firstGst = GST_ROWS[0];
const firstSebi = SEBI_ROWS[0];
const changes = rateChangesSince('2023-01-01');

const FAQ: FaqItem[] = [
  {
    question: 'Is STT charged on both the buy and the sell side of an F&O trade?',
    answer:
      "No. NSE Clearing's STT page says STT applies on all sell transactions in futures and options, with each futures trade valued at its traded price and each option trade at its premium. The NSE circulars list one other STT event for options: where an option is exercised, STT is payable by the purchaser. Buying a futures contract, or buying an option that is not exercised, has no STT row in them. Stamp duty is the charge that falls on the buyer.",
  },
  {
    question: 'Is STT charged if my option expires in the money?',
    answer:
      "For an option that is exercised the NSE circulars list a separate STT rate, payable by the purchaser: 0.15% from 1 April 2026 and 0.125% before. NSE Clearing's STT page says that on final exercise STT is levied on the intrinsic value if the option is in the money on the day of expiry, so an option that expires out of the money has no intrinsic value to tax. Use the Options, exercised leg with the intrinsic value from your contract note. This page calculates only the STT for an exercise: the SEBI fee on the notional value and any other charge on exercise are not calculated.",
  },
  {
    question: 'Why did my charges go up in April 2026?',
    answer:
      'The Finance Act, 2026 (assent 30 March 2026) raised STT from 1 April 2026: futures sale from 0.02% to 0.05%, option sale from 0.10% to 0.15% and exercised options from 0.125% to 0.15% (NSE/FATAX/73524, 31 March 2026). On 1 March 2026 NSE also rolled back its IPFT contribution and raised the transaction charge by the same amount, which left the total unchanged (NSE/FA/73061).',
  },
  {
    question: 'Which is right for NSE options, 0.03503% or 0.03553%?',
    answer:
      'Both are in NSE circulars, for different lines. From 1 October 2024 the transaction charge was Rs 35.03 per lakh of premium, 0.03503% (NSE/FA/64232), and NSE also levied an IPFT contribution of Rs 50 per crore, 0.0005%, on the trading member: 0.03553% together. From 1 March 2026 NSE/FA/73061 sets the transaction charge at Rs 3,552.99 per crore, 0.0355299%, and the IPFT contribution at Rs 0.01 per crore, which is 0.03553% together again. So 0.03553% as one figure matches NSE\'s total for every trade since 1 October 2024; only the split between the two lines changed on 1 March 2026. This page shows the two lines separately. Whether and how a broker lists the IPFT contribution on the contract note is the broker\'s choice.',
  },
  {
    question: 'Why is the exchange charge not shown for trades before 1 October 2024?',
    answer:
      "Before that date NSE charged trading members by monthly-volume slabs (NSE/FA/56129 from 1 April 2023, NSE/FA/61137 from 1 April 2024), so the rate on a trade depended on the broker's volume and not on the trade. SEBI's circular of 1 July 2024 required one uniform charge, which NSE applied from 1 October 2024 (NSE/FA/64232). The page shows \"not shown\" instead of guessing a slab; the contract note has the figure.",
  },
  {
    question: 'Are my charges higher than they should be?',
    answer:
      'This page cannot tell: the contract note is the authoritative record and brokerage is set by your broker. To check one trade, compare each line with the tables here: STT on the sale only, the exchange charge on each side, the SEBI fee, stamp duty on the buy side, and GST on brokerage, the exchange charge and the SEBI fee. Small gaps are normal: NSE Clearing rounds stamp duty to the nearest rupee per client (NCL/CMPT/43116), and a broker may show the IPFT contribution on its own line or inside another. A gap you cannot explain is a question for your broker.',
  },
  {
    question: "Does TradeQut use these exact rates in its estimates?",
    answer:
      "TradeQut estimates charges for trades imported from Indian brokers, and your contract note is authoritative. This page is a separate, source-checked reference. It does not claim that TradeQut's estimates use exactly the rates listed here for every trade date.",
  },
];

function SourceCell({ row }: { row: RateSource }) {
  return (
    <>
      <A to={row.source}>{row.circular}</A>, {fmtDate(row.circularDate)}
    </>
  );
}

function PartDetail({ part }: { part: Part }) {
  if (part.row && part.ratePct !== null) {
    return (
      <>
        {formatPct(part.ratePct)}, <A to={part.row.source}>{part.row.circular}</A>
        {part.note ? `, ${part.note}` : ''}
      </>
    );
  }
  return <>{part.note ?? ''}</>;
}

export function FoChargesRatesPage() {
  const [date, setDate] = useState(todayIso);
  const [leg, setLeg] = useState<Leg>('options-sell');
  const [valueText, setValueText] = useState('200000');
  const [brokerageText, setBrokerageText] = useState('');

  const legInfo = LEGS.find((l) => l.value === leg)!;
  const exercised = leg === 'options-exercised';
  const result = useMemo(
    () => calculateCharges({ date, leg, value: parseDecimal(valueText), brokerage: parseDecimal(brokerageText) }),
    [date, leg, valueText, brokerageText],
  );
  const dateOk = isIsoDate(date);
  const shown = exercised ? PART_ORDER.filter((k) => k === 'stt') : PART_ORDER;
  const partial = !exercised && !result.complete;

  const summary = !dateOk
    ? 'Enter a trade date to see the charges.'
    : `Total charges ${rupees(result.total)}${partial ? ', partial: some charges are not shown for this date' : ''}${
        result.pctOfValue === null ? '' : `, ${result.pctOfValue.toFixed(4)} percent of the value`
      }.`;

  return (
    <ContentPageShell title={TITLE} description={DESCRIPTION} path={PATH} jsonLd={calculatorSchema(NAME, DESCRIPTION, PATH, FAQ)} maxWidth="max-w-5xl">
      <Crumbs parent={{ path: '/resources', label: 'Resources' }} current={NAME} />

      <h1 className="mb-2 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">F&amp;O charges and STT rates by trade date</h1>
      <p className="mb-6 text-base text-foreground-soft">
        Look up the statutory charges on an NSE futures or options trade for the date it was made, with the circular each rate comes from.
      </p>

      <div className="max-w-[72ch]">
        <ShortAnswer>
          For NSE trades from {fmtDate(latestStt.effectiveFrom)}, STT is {formatPct(latestStt.futuresSell)} of the traded value of a futures contract sold and{' '}
          {formatPct(latestStt.optionsSell)} of the premium of an option sold; an option that is exercised pays {formatPct(latestStt.optionsExercised)}, payable by
          the purchaser. The exchange transaction charge, SEBI fee, stamp duty and GST are added to it. The tables below give every rate with its effective date
          and circular. Sources checked {CHECKED}.
        </ShortAnswer>
        <Callout title="Estimates only: your contract note is authoritative">
          This page applies published rates to the numbers you type. It does not know your broker&apos;s brokerage, rounding or how a charge is listed. What you
          type stays in your browser: it is not sent or stored.
        </Callout>
      </div>

      <CalcLayout
        inputs={
          <>
            <div>
              <label htmlFor="trade-date" className={calcLabelClass}>
                Trade date
              </label>
              <input id="trade-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={calcInputClass} />
              <p className="mt-1 text-xs text-muted-foreground">Rates follow the date the trade was executed.</p>
            </div>
            <div>
              <label htmlFor="leg" className={calcLabelClass}>
                Leg
              </label>
              <select id="leg" value={leg} onChange={(e) => setLeg(e.target.value as Leg)} className={calcInputClass}>
                {LEGS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">One leg at a time: charges differ for the buy and the sell leg.</p>
            </div>
            <div>
              <label htmlFor="value" className={calcLabelClass}>
                {legInfo.valueLabel}
              </label>
              <DecimalInput id="value" value={valueText} onChange={setValueText} />
              <p className="mt-1 text-xs text-muted-foreground">{legInfo.hint}</p>
            </div>
            {!exercised && (
              <div>
                <label htmlFor="brokerage" className={calcLabelClass}>
                  Brokerage for this leg (₹, optional)
                </label>
                <DecimalInput id="brokerage" value={brokerageText} onChange={setBrokerageText} />
                <p className="mt-1 text-xs text-muted-foreground">Typed by you: broker plans differ and none is built in. GST is added on it.</p>
              </div>
            )}
          </>
        }
        result={
          <>
            <h2 className="mb-4 text-base font-semibold text-foreground">Result</h2>
            {!dateOk ? (
              <p className="text-sm text-foreground-soft">Enter a trade date to see the charges.</p>
            ) : (
              <>
                <ul>
                  {shown.map((key) => (
                    <li key={key} className="flex items-start justify-between gap-4 border-t border-border/50 py-2 first:border-t-0 first:pt-0">
                      <div>
                        <p className="text-sm font-medium text-foreground">{PART_LABELS[key]}</p>
                        <p className="text-xs text-muted-foreground">
                          <PartDetail part={result.parts[key]} />
                        </p>
                      </div>
                      <p className="num shrink-0 text-sm font-semibold text-foreground">
                        {result.parts[key].amount === null ? 'not shown' : rupees(result.parts[key].amount)}
                      </p>
                    </li>
                  ))}
                  {!exercised && (
                    <li className="flex items-start justify-between gap-4 border-t border-border/50 py-2">
                      <p className="text-sm font-medium text-foreground">Brokerage (as typed)</p>
                      <p className="num shrink-0 text-sm font-semibold text-foreground">{rupees(result.brokerage)}</p>
                    </li>
                  )}
                </ul>
                <div className="mt-2 border-t border-border pt-3">
                  <p className="text-sm text-muted-foreground">{partial ? 'Total of the charges shown (partial)' : exercised ? 'STT on exercise' : 'Total charges'}</p>
                  <p className="num text-2xl font-semibold text-foreground">{rupees(result.total)}</p>
                  {result.pctOfValue !== null && (
                    <p className="text-xs text-muted-foreground">{result.pctOfValue.toFixed(4)}% of the {legInfo.valueLabel.split(' (')[0].toLowerCase()}</p>
                  )}
                </div>
                {partial && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    A charge marked &ldquo;not shown&rdquo; has no verified single rate for this date, so it is left out of the total rather than guessed.
                  </p>
                )}
                {exercised && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    For an exercised option only STT is calculated here. The SEBI fee also applies to the notional value, and other charges on exercise are not
                    calculated.
                  </p>
                )}
                {date > RATES_CHECKED_ON && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    This date is after {CHECKED}, when the sources were last checked: a later circular may have changed a rate.
                  </p>
                )}
              </>
            )}
            <FormulaDisclosure>
              <p>STT = value × rate, on the sale of futures and options and, for an exercised option, on its intrinsic value (payable by the purchaser).</p>
              <p>NSE transaction charge and IPFT contribution = value × rate, on each side.</p>
              <p>SEBI turnover fee = value × {formatPct(SEBI_ROWS[SEBI_ROWS.length - 1].pct)}, on the premium for options.</p>
              <p>Stamp duty = value × rate, on the buyer only.</p>
              <p>GST = 18% × (brokerage + NSE transaction charge) + 18% × SEBI fee, the SEBI fee part from 18 Jul 2022. The IPFT contribution is not in the base.</p>
              <p>Each amount is rounded to the paisa and the total adds the rounded amounts.</p>
            </FormulaDisclosure>
            <LiveResult text={summary} />
          </>
        }
      />

      <H2 id="rates">Rates by effective date</H2>
      <P>
        Each table lists the rows in date order. A trade takes the row whose effective date is on or before its trade date. Percentages are of the value
        shown in the column: traded value for futures, premium for options, intrinsic value for an exercised option.
      </P>

      <Table
        caption="Securities transaction tax (NSE/FATAX circulars)"
        head={['Effective from', 'Futures, sale', 'Options, sale (premium)', 'Options, exercised (payable by purchaser)', 'Circular']}
        rows={STT_ROWS.map((r) => [
          fmtDate(r.effectiveFrom),
          formatPct(r.futuresSell),
          formatPct(r.optionsSell),
          formatPct(r.optionsExercised),
          <SourceCell key={r.circular} row={r} />,
        ])}
      />

      <Table
        caption="NSE transaction charge and IPFT contribution, each side (NSE/FA circulars)"
        head={['Effective from', 'Futures, traded value', 'Options, premium', 'Note', 'Circular']}
        rows={EXCHANGE_ROWS.map((r) => [
          fmtDate(r.effectiveFrom),
          r.rates ? `${formatPct(r.rates.futures.charge)} + IPFT ${formatPct(r.rates.futures.ipft)}` : `Volume slabs${r.slabIpft ? ` + IPFT ${formatPct(r.slabIpft.futures)}` : ''}`,
          r.rates ? `${formatPct(r.rates.options.charge)} + IPFT ${formatPct(r.rates.options.ipft)}` : `Volume slabs${r.slabIpft ? ` + IPFT ${formatPct(r.slabIpft.options)}` : ''}`,
          r.note,
          <SourceCell key={r.circular} row={r} />,
        ])}
      />
      <P>
        The two lines together are 0.00183% for futures and 0.03553% for options from 1 October 2024 to the date checked. NSE moved a small part between them on 1
        March 2026 without changing the total.
      </P>

      <Table
        caption="SEBI turnover fee"
        head={['Effective from', 'Rate', 'Note', 'Source']}
        rows={SEBI_ROWS.map((r, i) => [fmtDate(r.effectiveFrom), formatPct(r.pct), r.note, <SourceCell key={`${r.circular}${i}`} row={r} />])}
      />

      <Table
        caption="Stamp duty (buyer) and GST"
        head={['Effective from', 'Charge', 'Rate', 'Note', 'Source']}
        rows={[
          ...STAMP_ROWS.map((r) => [
            fmtDate(r.effectiveFrom),
            'Stamp duty',
            `futures ${formatPct(r.futuresBuy)}, options ${formatPct(r.optionsBuy)}`,
            r.note,
            <SourceCell key={r.circular} row={r} />,
          ]),
          ...GST_ROWS.map((r) => [
            fmtDate(r.effectiveFrom),
            'GST',
            `${formatPct(r.services)} on brokerage and exchange charges; ${formatPct(r.sebiFee)} on the SEBI fee`,
            r.note,
            <SourceCell key={r.circular} row={r} />,
          ]),
        ]}
      />

      <H2 id="changes">Rate changes since 2023</H2>
      <Table
        caption={`Every change to a rate on this page from 1 January 2023 to ${CHECKED}`}
        head={['Effective from', 'Charge', 'Before', 'From this date', 'Circular']}
        rows={changes.map((c) => [fmtDate(c.effectiveFrom), c.charge, c.before ?? 'n/a', c.now, <SourceCell key={`${c.circular}${c.charge}`} row={c} />])}
      />
      <P>
        The SEBI turnover fee, stamp duty and GST rates did not change in this period in the documents read.
      </P>

      <div className="max-w-[72ch]">
        <H2 id="checked">Sources and when they were checked</H2>
        <P>
          Every rate above was read from the document linked in its row on {CHECKED}. NSE&apos;s circular list was searched through that date for revisions to STT,
          transaction charges and the IPFT contribution; the last STT circular found is {latestStt.circular} ({fmtDate(latestStt.circularDate)}) and the last
          transaction-charge circular is {latestExchange.circular} ({fmtDate(latestExchange.circularDate)}). Rows are only ever added: a trade is always priced
          from the row in force on its date. Check again each March, when the Finance Act changes STT, and whenever NSE or SEBI issues a charges circular.
        </P>

        <H2 id="not-covered">What this page does not cover</H2>
        <UL>
          <li>
            Trades before the dates where a source was verified show &ldquo;not shown: source not verified&rdquo; for that charge: STT before{' '}
            {fmtDate(STT_ROWS[0].effectiveFrom)}, the SEBI fee before {fmtDate(firstSebi.effectiveFrom)}, stamp duty before {fmtDate(firstStamp.effectiveFrom)}, GST
            before {fmtDate(firstGst.effectiveFrom)}.
          </li>
          <li>The exchange charge before 1 October 2024, when it was a volume slab of the broker rather than a rate on the trade.</li>
          <li>BSE, and currency, commodity and interest-rate derivatives.</li>
          <li>
            Physically settled stock derivatives: NSE Clearing says the delivery-based STT rates apply to them, payable by both the purchaser and the seller.
          </li>
          <li>
            The SEBI fee on the notional value of an option that is exercised or assigned (SEBI Stock Brokers Regulations, 2026, regulation 41), and the other
            charges on an exercise.
          </li>
          <li>
            Waivers on new index contracts: for example NSE charged no transaction charges on Nifty India FPI 150 Index futures and options from 12 August 2026
            to 28 February 2027 (NSE/FA/75961).
          </li>
          <li>Brokerage, depository charges and any other fee your broker adds.</li>
        </UL>

        <Faq items={FAQ} />
        <P>
          Planning to use the figures? Brokerage and the total depend on your broker; the <A to="/blog/fo-trading-charges-india">F&amp;O charges in India</A> article
          walks through a full round trip. Charges are not part of turnover for tax audit: see the{' '}
          <A to="/resources/fo-turnover-calculator">F&amp;O turnover calculator</A>, and{' '}
          <A to="/fo-trading-journal">the F&amp;O trading journal</A> shows how TradeQut records trades with their estimated charges.
        </P>

        <Sources
          items={[
            { label: 'NSE/FATAX/32385: STT, 16 May 2016', url: 'https://nsearchives.nseindia.com/content/circulars/FATAX32385.pdf', checked: RATES_CHECKED_ON },
            { label: 'NSE/FATAX/56235: STT, 1 April 2023', url: 'https://nsearchives.nseindia.com/content/circulars/FATAX56235.pdf', checked: RATES_CHECKED_ON },
            { label: 'NSE/FATAX/63809: STT, 9 September 2024', url: 'https://nsearchives.nseindia.com/content/circulars/FATAX63809.pdf', checked: RATES_CHECKED_ON },
            { label: 'NSE/FATAX/73524: STT, 31 March 2026', url: 'https://nsearchives.nseindia.com/content/circulars/FATAX73524.pdf', checked: RATES_CHECKED_ON },
            {
              label: 'NSE Clearing: Securities Transaction Tax (how STT is valued; updated 1 August 2025)',
              url: 'https://www.nseindia.com/products-services/equity-derivatives-securities-transaction-tax',
              checked: RATES_CHECKED_ON,
            },
            { label: 'NSE/FA/56129: transaction charges and IPFT, 24 March 2023', url: 'https://nsearchives.nseindia.com/content/circulars/FA56129.pdf', checked: RATES_CHECKED_ON },
            { label: 'NSE/FA/61137: transaction charges, 14 March 2024', url: 'https://nsearchives.nseindia.com/content/circulars/FA61137.pdf', checked: RATES_CHECKED_ON },
            { label: 'NSE/FA/64232: transaction charges, 27 September 2024', url: 'https://nsearchives.nseindia.com/content/circulars/FA64232.pdf', checked: RATES_CHECKED_ON },
            { label: 'NSE/FA/73061: transaction charges and IPFT, 27 February 2026', url: 'https://nsearchives.nseindia.com/content/circulars/FA73061.pdf', checked: RATES_CHECKED_ON },
            { label: 'NSE/FA/75961: Nifty India FPI 150 Index charges waiver, 25 August 2026', url: 'https://nsearchives.nseindia.com/content/circulars/FA75961.pdf', checked: RATES_CHECKED_ON },
            { label: 'NSE/FA/40632: SEBI turnover fee, 2 April 2019', url: 'https://nsearchives.nseindia.com/content/circulars/FA40632.pdf', checked: RATES_CHECKED_ON },
            { label: 'NSE/FA/44514: SEBI turnover fee relief, 29 May 2020', url: 'https://nsearchives.nseindia.com/content/circulars/FA44514.pdf', checked: RATES_CHECKED_ON },
            {
              label: 'SEBI (Stock Brokers) Regulations, 2026, Gazette of 7 January 2026 (regulation 41)',
              url: 'https://www.sebi.gov.in/sebi_data/attachdocs/jan-2026/1767852346757.pdf',
              checked: RATES_CHECKED_ON,
            },
            {
              label: 'Indian Stamp Act, 1899, Schedule I, Article 56A (Department of Revenue copy)',
              url: 'https://dor.gov.in/files/inline-documents/Indian_Stamp_Act_1899.pdf',
              checked: RATES_CHECKED_ON,
            },
            { label: 'NSE Clearing NCL/CMPT/43116: stamp duty in the F&O segment, 3 January 2020', url: 'https://nsearchives.nseindia.com/content/circulars/CMPT43116.zip', checked: RATES_CHECKED_ON },
            {
              label: 'NSE Clearing NCL/CMPT/44033: stamp duty from trade date 1 July 2020, with the Gazette notifications of 30 March 2020',
              url: 'https://nsearchives.nseindia.com/content/circulars/CMPT44033.zip',
              checked: RATES_CHECKED_ON,
            },
            {
              label: 'Notification 11/2017-Central Tax (Rate), 28 June 2017 (heading 9971)',
              url: 'https://cbic-gst.gov.in/hindi/pdf/central-tax-rate/Notification11-CGST.pdf',
              checked: RATES_CHECKED_ON,
            },
            {
              label: 'Notification 8/2017-Integrated Tax (Rate), 28 June 2017 (heading 9971)',
              url: 'https://cbic-gst.gov.in/hindi/pdf/integrated-tax-rate/Notification8-IGST.pdf',
              checked: RATES_CHECKED_ON,
            },
            { label: 'NSE/FATAX/52993: GST on SEBI fees, 18 July 2022', url: 'https://nsearchives.nseindia.com/content/circulars/FATAX52993.pdf', checked: RATES_CHECKED_ON },
          ]}
        />
        <Disclaimer>
          Estimates for information only: the contract note from your broker is the authoritative record of what you were charged. TradeQut is a journaling and
          analytics tool, not a SEBI-registered investment adviser or research analyst, and nothing here is a recommendation to buy or sell any security. Rates
          change; check the linked circulars before relying on a number.
        </Disclaimer>
        <SignupCta />
      </div>
    </ContentPageShell>
  );
}
