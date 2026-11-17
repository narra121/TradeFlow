import { useMemo, useState, type ReactNode } from 'react';
import { ContentPageShell } from '@/components/content/ContentPageShell';
import {
  CalcLayout,
  DecimalInput,
  FormulaDisclosure,
  LiveResult,
  calcInputClass,
  calcLabelClass,
} from '@/components/content/calculator';
import { A, Callout, Crumbs, Disclaimer, Faq, H2, OL, P, ShortAnswer, SignupCta, Sources, Table, UL } from '@/content/components/ArticleParts';
import type { FaqItem } from '@/content/product-facts';
import { calculatorSchema } from '@/config/seo';
import { formatMoney } from '@/lib/format';
import {
  LIMIT_ONE_CRORE,
  LIMIT_TEN_CRORE,
  compareToLimit,
  computeFoTurnover,
  parseAmount,
  parsePnlList,
  type Amount,
  type PnlList,
  type TurnoverInputs,
} from '@/lib/tax/foTurnover';
import { cn } from '@/lib/utils';

const PATH = '/resources/fo-turnover-calculator';
const NAME = 'F&O turnover calculator';
const TITLE = 'F&O turnover calculator for tax audit (ICAI) | TradeQut';
const DESCRIPTION =
  'Add up F&O turnover by the ICAI Guidance Note method: absolute profits and losses, no net-off, premium rule shown. Explains the method; not tax advice.';
const METHOD_LINE = 'Method: ICAI Guidance Note on Tax Audit under section 44AB, 11th edition (Revised 2026), paras 3.1 and 5.11. Read 15 Nov 2026.';

const rupees = (n: number) => formatMoney(n, 'INR', { decimals: 2 });
const crore = (n: number) => `${(n / 10_000_000).toFixed(2)} crore`;

const EXAMPLE: TurnoverInputs = {
  futuresProfits: 600_000,
  futuresLosses: 590_000,
  optionsProfits: 250_000,
  optionsLosses: 310_000,
  premiumReceived: 2_000_000,
  otherTurnover: 0,
};
const EXAMPLE_RESULT = computeFoTurnover(EXAMPLE);
const EXAMPLE_NET = EXAMPLE.futuresProfits - EXAMPLE.futuresLosses + EXAMPLE.optionsProfits - EXAMPLE.optionsLosses;

const FAQ: FaqItem[] = [
  {
    question: 'Is F&O turnover the contract value or the sum of profits and losses?',
    answer:
      'For squared-off futures and options the ICAI Guidance Note counts the differences, not the contract value. Para 5.11(b)(i): "The total of favourable and unfavourable differences in case of squared off transactions shall be taken as turnover." The Note adds that contract notes carry the full value while the books record only the differences (para 5.11(b)). Delivery-based transactions are treated differently: para 5.11(c) takes the total sale value, and this calculator does not cover them.',
  },
  {
    question: 'Do profits and losses net off?',
    answer:
      'No. Para 5.11(a), written for speculative transactions, says: "Each transaction resulting into whether a positive or negative difference is an independent transaction." Para 5.11(b)(i) uses the same two words, favourable and unfavourable differences, for futures and options, so this calculator adds profits and losses as positive amounts. A trade with a profit of ₹10,000 and another with a loss of ₹10,000 give ₹20,000, not zero.',
  },
  {
    question: 'Is the premium received on options I sold added to turnover?',
    answer:
      'Para 5.11(b)(ii) says premium received on sale of options is also included in turnover. It then says: "However, where the premium received is included for determining net profit for transactions, then such net profit should not be separately included." Whether your profit figures already contain the premium depends on how your report computes them, and the sentence can be read more than one way, so the calculator shows two totals: one with the premium added to the differences and one with nothing added for it. Ask your chartered accountant which reading they apply.',
  },
  {
    question: 'Are brokerage and STT part of turnover?',
    answer:
      'Para 5.11(b)(i) is about the differences on squared-off transactions; it does not list brokerage, STT or other charges. The calculator adds exactly the figures you enter and neither adds nor removes charges. If your report shows P&L after charges, ask your chartered accountant which figure to use.',
  },
  {
    question: 'My net result is a small loss but my turnover is large. Does the loss decide the audit?',
    answer:
      'The limits in section 44AB(a) are written on total sales, turnover or gross receipts (para 3.1), and para 5.11 builds F&O turnover from absolute differences, so a small net result can sit beside a large turnover. Section 44AB has other clauses too, including ones that depend on the presumptive schemes (para 3.1); this calculator does not evaluate them. Check with a chartered accountant.',
  },
  {
    question: 'My broker shows ₹80 lakh turnover but ₹9 crore moved through my bank. Which one counts?',
    answer:
      'They measure different things. Para 5.11(b) takes the differences on squared-off transactions, plus premium as in (ii), and observes that the books record the differences although contract notes carry the full value. Para 5.11 does not mention bank movement. How a figure on a broker report maps to the Note, and which total applies to you, is a question for your chartered accountant.',
  },
  {
    question: 'Why do tradewise and scripwise turnover differ in a broker tax report?',
    answer:
      'The grouping changes the answer. If profit and loss are netted inside a group before the absolute value is taken, the total is smaller: two trades in one contract, +₹5,000 and −₹3,000, count as ₹8,000 when each trade is taken separately and ₹2,000 when the contract is taken as a whole. Zerodha\'s help article says its tradewise sheet is calculated on each trade and its segments sheet on each stock or contract, so the two can differ. Para 5.11 speaks of each transaction and does not say how fills are grouped into one; ask your chartered accountant which basis to use, and use one basis throughout.',
  },
  {
    question: 'My losses are spread over several brokers. Do I combine them?',
    answer:
      'Section 44AB(a), as printed in para 3.1, refers to a person\'s total sales, turnover or gross receipts in business, so the test is on the person, not on one broker account. Add the figures from every account that is yours to the same list, on the same basis. Which accounts count as yours is a question for your chartered accountant.',
  },
  {
    question: 'What about positions still open on 31 March?',
    answer:
      'Para 5.11(b)(iv) says the turnover from a position that is open at the end of the financial year is considered in the financial year in which it is actually squared off. A trade carried across 31 March therefore goes into the year it is squared off.',
  },
];

type Mode = 'totals' | 'paste';
type Answer = 'unsure' | 'yes' | 'no';

const TOTAL_FIELDS = [
  { key: 'futuresProfits', id: 'fut-profits', label: 'Futures: total of profits', hint: 'Sum of the squared-off futures trades that made a profit.' },
  { key: 'futuresLosses', id: 'fut-losses', label: 'Futures: total of losses', hint: 'Sum of the squared-off futures trades that made a loss, typed as a positive number.' },
  { key: 'optionsProfits', id: 'opt-profits', label: 'Options: total of profits', hint: 'Sum of the squared-off options trades that made a profit.' },
  { key: 'optionsLosses', id: 'opt-losses', label: 'Options: total of losses', hint: 'Sum of the squared-off options trades that made a loss, typed as a positive number.' },
] as const;
type TotalKey = (typeof TOTAL_FIELDS)[number]['key'];

function ChoiceGroup<T extends string>({
  legend,
  name,
  value,
  onChange,
  options,
  hint,
}: {
  legend: string;
  name: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  hint?: string;
}) {
  return (
    <fieldset>
      <legend className={calcLabelClass}>{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              'flex h-10 max-md:h-11 min-w-24 flex-1 cursor-pointer items-center justify-center rounded-md border px-3 text-center text-sm font-medium has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring',
              value === o.value ? 'border-primary bg-primary/10 text-primary' : 'border-input text-foreground-soft hover:bg-secondary',
            )}
          >
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </fieldset>
  );
}

const amountError = (a: Amount): string | null =>
  a.error === 'negative' ? 'Type it as a positive number: a loss of ₹5,000 is 5000.' : a.error === 'invalid' ? 'This is not a number.' : null;

function AmountField({ id, label, hint, value, onChange, amount }: { id: string; label: string; hint?: string; value: string; onChange: (t: string) => void; amount: Amount }) {
  const error = amountError(amount);
  return (
    <div>
      <label htmlFor={id} className={calcLabelClass}>
        {label}
      </label>
      <DecimalInput id={id} value={value} onChange={onChange} error={error} />
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ListField({ id, label, value, onChange, list }: { id: string; label: string; value: string; onChange: (t: string) => void; list: PnlList }) {
  return (
    <div>
      <label htmlFor={id} className={calcLabelClass}>
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        spellCheck={false}
        autoComplete="off"
        placeholder={'1250\n-800\n₹2,300.50'}
        className={cn(calcInputClass, 'h-auto max-md:h-auto min-h-32 py-2 font-mono text-sm')}
      />
      <p className="mt-1 text-xs text-muted-foreground">
        {list.lines} {list.lines === 1 ? 'line' : 'lines'} read: profits {rupees(list.profits)}, losses {rupees(list.losses)}.
        {list.ignored.length > 0 && (
          <>
            {' '}
            {list.ignored.length} {list.ignored.length === 1 ? 'line is' : 'lines are'} not a single number and {list.ignored.length === 1 ? 'was' : 'were'} left out:{' '}
            {list.ignored
              .slice(0, 3)
              .map((l) => `"${l.length > 30 ? `${l.slice(0, 30)}…` : l}"`)
              .join(', ')}
            {list.ignored.length > 3 ? ', …' : ''}.
          </>
        )}
      </p>
    </div>
  );
}

interface ReadingView {
  heading: string;
  tag: string | null;
  muted: boolean;
  lines: [string, string][];
  total: number;
}

function Reading({ view, showTotalLabel }: { view: ReadingView; showTotalLabel: string }) {
  return (
    <section className={cn('rounded-md border p-3', view.tag ? 'border-primary/60' : 'border-border/60', view.muted && 'text-muted-foreground')}>
      <h3 className="text-sm font-semibold text-foreground">{view.heading}</h3>
      {view.tag && <p className="text-xs text-primary">{view.tag}</p>}
      <dl className="mt-2 space-y-1 text-sm">
        {view.lines.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt>{label}</dt>
            <dd className="num text-right">{value}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-3 border-t border-border/50 pt-1 font-semibold text-foreground">
          <dt>{showTotalLabel}</dt>
          <dd className="num text-right">{rupees(view.total)}</dd>
        </div>
      </dl>
      {view.total >= 100_000 && <p className="mt-1 text-right text-xs text-muted-foreground">{crore(view.total)}</p>}
    </section>
  );
}

export function FoTurnoverCalculatorPage() {
  const [mode, setMode] = useState<Mode>('totals');
  const [totals, setTotals] = useState<Record<TotalKey, string>>({ futuresProfits: '', futuresLosses: '', optionsProfits: '', optionsLosses: '' });
  const [futuresList, setFuturesList] = useState('');
  const [optionsList, setOptionsList] = useState('');
  const [premiumText, setPremiumText] = useState('');
  const [otherText, setOtherText] = useState('');
  const [premiumInPnl, setPremiumInPnl] = useState<Answer>('unsure');
  const [cash, setCash] = useState<Answer>('unsure');

  const view = useMemo(() => {
    const amounts = {
      futuresProfits: parseAmount(totals.futuresProfits),
      futuresLosses: parseAmount(totals.futuresLosses),
      optionsProfits: parseAmount(totals.optionsProfits),
      optionsLosses: parseAmount(totals.optionsLosses),
    };
    const premium = parseAmount(premiumText);
    const other = parseAmount(otherText);
    const futures = parsePnlList(futuresList);
    const options = parsePnlList(optionsList);
    const hasError = [premium, other, ...(mode === 'totals' ? Object.values(amounts) : [])].some((a) => a.error);
    const touched =
      premiumText.trim() !== '' ||
      otherText.trim() !== '' ||
      (mode === 'totals' ? Object.values(totals).some((t) => t.trim() !== '') : futuresList.trim() !== '' || optionsList.trim() !== '');
    const inputs: TurnoverInputs =
      mode === 'totals'
        ? {
            futuresProfits: amounts.futuresProfits.value,
            futuresLosses: amounts.futuresLosses.value,
            optionsProfits: amounts.optionsProfits.value,
            optionsLosses: amounts.optionsLosses.value,
            premiumReceived: premium.value,
            otherTurnover: other.value,
          }
        : {
            futuresProfits: futures.profits,
            futuresLosses: futures.losses,
            optionsProfits: options.profits,
            optionsLosses: options.losses,
            premiumReceived: premium.value,
            otherTurnover: other.value,
          };
    return { amounts, premium, other, futures, options, hasError, touched, result: computeFoTurnover(inputs) };
  }, [mode, totals, futuresList, optionsList, premiumText, otherText]);

  const { result, hasError, touched } = view;
  const showBoth = result.premiumReceived > 0;

  const readingLines = (withPremium: boolean): [string, string][] => {
    const lines: [string, string][] = [
      ['Futures turnover', rupees(result.futures)],
      ['Options: profits and losses added', rupees(result.optionsDifferences)],
    ];
    if (showBoth) lines.push(['Options: premium received on sale', withPremium ? rupees(result.premiumReceived) : 'not added separately']);
    lines.push(['Options turnover', rupees(withPremium ? result.premiumAdded.options : result.premiumNotAdded.options)]);
    if (result.other > 0) lines.push(['Other business turnover', rupees(result.other)]);
    return lines;
  };

  const readings: ReadingView[] = showBoth
    ? [
        {
          heading: 'Premium added to the differences',
          tag: premiumInPnl === 'no' ? 'Your answer: the premium is not in the figures above' : null,
          muted: premiumInPnl === 'yes',
          lines: readingLines(true),
          total: result.premiumAdded.total,
        },
        {
          heading: 'Premium not added separately',
          tag: premiumInPnl === 'yes' ? 'Your answer: the premium is already in the figures above' : null,
          muted: premiumInPnl === 'no',
          lines: readingLines(false),
          total: result.premiumNotAdded.total,
        },
      ]
    : [{ heading: 'Turnover', tag: null, muted: false, lines: readingLines(false), total: result.premiumNotAdded.total }];

  const limitCell = (limit: number): ReactNode =>
    readings.map((r) => {
      const c = compareToLimit(r.total, limit);
      const text = c.relation === 'equal' ? 'equal to the limit' : `${rupees(c.difference)} ${c.relation} the limit`;
      return (
        <span key={r.heading} className="block">
          {showBoth ? `${r.heading}: ` : ''}
          {text}
        </span>
      );
    });

  const limitName = (limit: number, applies: string): ReactNode => (
    <>
      <span className="block font-medium text-foreground">{rupees(limit)}</span>
      <span className="block text-xs">({crore(limit)})</span>
      <span className="mt-1 block text-xs">{applies}</span>
    </>
  );

  const appliesText = (forCash: 'yes' | 'no'): string => {
    if (cash === 'unsure') return forCash === 'yes' ? 'Applies if both cash conditions hold' : 'Applies if they do not both hold';
    return cash === forCash ? 'Applies, by your answer' : 'Does not apply, by your answer';
  };

  const summary = !touched
    ? 'Enter your figures to see the turnover.'
    : hasError
      ? 'Some figures need fixing before the turnover can be shown.'
      : showBoth
        ? `F&O turnover ${rupees(result.premiumAdded.total)} with the premium added, ${rupees(result.premiumNotAdded.total)} with the premium not added separately.`
        : `F&O turnover ${rupees(result.premiumNotAdded.total)}.`;

  return (
    <ContentPageShell
      title={TITLE}
      description={DESCRIPTION}
      path={PATH}
      jsonLd={calculatorSchema(NAME, DESCRIPTION, PATH, FAQ)}
      maxWidth="max-w-5xl"
    >
      <Crumbs parent={{ path: '/resources', label: 'Resources' }} current={NAME} />

      <h1 className="mb-2 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">F&amp;O turnover calculator for tax audit (ICAI method)</h1>
      <p className="mb-6 text-base text-foreground-soft">Add up futures and options turnover the way the ICAI Guidance Note describes it.</p>

      <div className="max-w-[72ch]">
        <ShortAnswer>
          For futures and options, the ICAI Guidance Note does not use the contract value or your net profit. It takes the total of the favourable and
          unfavourable differences on squared-off transactions, with profits and losses added as positive amounts and never netted, and it has a separate
          rule for the premium received on options sold (para 5.11(b)).
        </ShortAnswer>
        <Callout title="Explains a method; not tax advice">
          This page shows how the ICAI method adds up turnover. It does not say whether an audit is required, which return form to use or how much tax is
          payable. Confirm with a chartered accountant. The figures you type stay in your browser: they are not sent or stored.
        </Callout>
      </div>

      <CalcLayout
        inputs={
          <>
            <ChoiceGroup<Mode>
              legend="How do you want to enter your figures?"
              name="entry-mode"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'totals', label: 'Enter totals' },
                { value: 'paste', label: 'Paste a list' },
              ]}
            />
            {mode === 'totals' ? (
              TOTAL_FIELDS.map((f) => (
                <AmountField
                  key={f.id}
                  id={f.id}
                  label={f.label}
                  hint={f.hint}
                  value={totals[f.key]}
                  onChange={(t) => setTotals((prev) => ({ ...prev, [f.key]: t }))}
                  amount={view.amounts[f.key]}
                />
              ))
            ) : (
              <>
                <ListField id="fut-list" label="Futures: one realised profit or loss per line" value={futuresList} onChange={setFuturesList} list={view.futures} />
                <ListField id="opt-list" label="Options: one realised profit or loss per line" value={optionsList} onChange={setOptionsList} list={view.options} />
                <p className="-mt-2 text-xs text-muted-foreground">
                  Write a loss as -1,200 or (1,200). Blank lines, commas and the ₹ sign are fine.
                </p>
              </>
            )}
            <p className="text-xs text-muted-foreground">
              Use one basis for every figure, for example each trade or each contract, as your report gives it. The same trades add up differently on different
              bases; see the questions below.
            </p>
            <AmountField
              id="premium-received"
              label="Premium received on options sold (₹)"
              hint="Total premium received on the option sale legs in the year."
              value={premiumText}
              onChange={setPremiumText}
              amount={view.premium}
            />
            <ChoiceGroup<Answer>
              legend="Is that premium already inside the options profits and losses above?"
              name="premium-in-pnl"
              value={premiumInPnl}
              onChange={setPremiumInPnl}
              options={[
                { value: 'unsure', label: 'Not sure' },
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' },
              ]}
              hint="The Note's wording can be read more than one way, so both totals are shown. Your answer only marks one of them."
            />
            <AmountField
              id="other-turnover"
              label="Other business turnover to add (₹, optional)"
              hint="Turnover from other business that you have worked out yourself. It is added to the total as typed."
              value={otherText}
              onChange={setOtherText}
              amount={view.other}
            />
            <ChoiceGroup<Answer>
              legend="Cash receipts are 5% or less of all receipts, and cash payments are 5% or less of all payments"
              name="cash-conditions"
              value={cash}
              onChange={setCash}
              options={[
                { value: 'unsure', label: 'Not sure' },
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' },
              ]}
              hint="A cheque or bank draft that is not account payee counts as cash (para 3.1). Not sure shows both limits."
            />
          </>
        }
        result={
          <>
            <h2 className="mb-4 text-base font-semibold text-foreground">Result</h2>
            {!touched ? (
              <p className="text-sm text-foreground-soft">Enter your figures to see the turnover.</p>
            ) : hasError ? (
              <p role="alert" className="text-sm text-loss">
                Fix the figures marked in the inputs to see the turnover.
              </p>
            ) : (
              <div className="space-y-4">
                {showBoth && (
                  <p className="text-xs text-muted-foreground">
                    Two totals are shown because the Note&apos;s sentence on premium (para 5.11(b)(ii)) can be read more than one way.
                  </p>
                )}
                {readings.map((r) => (
                  <Reading key={r.heading} view={r} showTotalLabel={showBoth ? 'Total' : 'Total F&O turnover'} />
                ))}
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">Where the total sits against the section 44AB(a) limits</h3>
                  <Table
                    head={['Limit and when it applies', 'Total against the limit']}
                    rows={[
                      [limitName(LIMIT_ONE_CRORE, appliesText('no')), limitCell(LIMIT_ONE_CRORE)],
                      [limitName(LIMIT_TEN_CRORE, appliesText('yes')), limitCell(LIMIT_TEN_CRORE)],
                    ]}
                  />
                  <p className="text-sm text-foreground-soft">
                    If the total is above the limit that applies to you, section 44AB audit provisions are relevant. Check other triggers (presumptive-scheme
                    conditions) and confirm with a chartered accountant.
                  </p>
                </div>
                <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  <li>A position open on 31 March counts in the year it is squared off (para 5.11(b)(iv)).</li>
                  <li>
                    Charges are neither added nor deducted: the calculator uses exactly the figures you enter (para 5.11(b)(i) speaks of the differences on
                    squared-off transactions).
                  </li>
                </ul>
              </div>
            )}
            <p className="mt-4 text-xs text-muted-foreground">{METHOD_LINE}</p>
            <FormulaDisclosure>
              <p>Futures turnover = futures profits + futures losses, with losses taken as positive amounts. Nothing is netted.</p>
              <p>Options profits and losses are added the same way. Premium added: options turnover = options profits and losses + premium received on options sold.</p>
              <p>Premium not added separately: options turnover = options profits and losses.</p>
              <p>Total = futures turnover + options turnover + other business turnover, compared with {rupees(LIMIT_ONE_CRORE)} and {rupees(LIMIT_TEN_CRORE)}.</p>
            </FormulaDisclosure>
            <LiveResult text={summary} />
          </>
        }
      />

      <div className="max-w-[72ch]">
        <H2>How the ICAI Guidance Note counts F&amp;O turnover</H2>
        <P>
          Para 5.11(b) of the Guidance Note on Tax Audit under section 44AB sets out the method for derivatives and says it is only for computing turnover for tax
          audit. In short:
        </P>
        <OL>
          <li>Squared-off futures and options: the favourable and the unfavourable differences are totalled. Each transaction stands on its own, so a profit and a loss are not set off against each other (5.11(a) and (b)(i)).</li>
          <li>Premium received on sale of options is also included. Where the premium is already included in determining the net profit, the Note says that net profit is not included separately (5.11(b)(ii)). This calculator shows both readings.</li>
          <li>The difference on any reverse trade also forms part of turnover (5.11(b)(iii)).</li>
          <li>A position open at the end of the financial year is considered in the year it is actually squared off (5.11(b)(iv)).</li>
          <li>Delivery-based settlement of a derivative has its own rule: the difference between trade price and settlement price, and the entire sale value for the transferor where the underlying is held as stock in trade (5.11(b)(v)). This calculator does not cover it.</li>
        </OL>
        <P>
          The Note states that the method is solely for deciding whether section 44AB applies and does not change whether income is classed as capital gains or as
          business income (closing paragraph of 5.11).
        </P>

        <H2>A worked example</H2>
        <P>Made-up figures for one year, to show why turnover is not the net result:</P>
        <Table
          caption="Example inputs and the two readings of the premium rule"
          head={['Line', 'Amount']}
          rows={[
            ['Futures profits', rupees(EXAMPLE.futuresProfits)],
            ['Futures losses', rupees(EXAMPLE.futuresLosses)],
            ['Options profits', rupees(EXAMPLE.optionsProfits)],
            ['Options losses', rupees(EXAMPLE.optionsLosses)],
            ['Premium received on options sold', rupees(EXAMPLE.premiumReceived)],
            ['Futures turnover (profits + losses)', rupees(EXAMPLE_RESULT.futures)],
            ['Options profits + losses', rupees(EXAMPLE_RESULT.optionsDifferences)],
            ['Total, premium added', rupees(EXAMPLE_RESULT.premiumAdded.total)],
            ['Total, premium not added separately', rupees(EXAMPLE_RESULT.premiumNotAdded.total)],
          ]}
        />
        <P>
          The same trades net to {formatMoney(EXAMPLE_NET, 'INR', { decimals: 2 })}, yet the turnover is {rupees(EXAMPLE_RESULT.premiumNotAdded.total)} or{' '}
          {rupees(EXAMPLE_RESULT.premiumAdded.total)} depending on the premium reading. Turnover here is a measure of activity, not of profit.
        </P>

        <H2>The limits in section 44AB(a)</H2>
        <P>
          Section 44AB(a), as printed in para 3.1 of the Note, uses one crore rupees ({rupees(LIMIT_ONE_CRORE)}) of total sales, turnover or gross receipts in business in the previous
          year. It uses ten crore rupees ({rupees(LIMIT_TEN_CRORE)}) instead where cash receipts are 5% or less of all amounts received and cash payments are 5% or less of all
          payments made; a cheque or bank draft that is not account payee is treated as cash. The calculator compares your total with both figures and does not
          decide which one applies to you.
        </P>

        <H2>What this calculator does not do</H2>
        <UL>
          <li>It does not say whether an audit is required, which return form to use or how much tax is payable.</li>
          <li>It does not cover delivery-based transactions (para 5.11(c)) or delivery settlement of derivatives (5.11(b)(v)).</li>
          <li>It does not test the other clauses of section 44AB, such as those for presumptive-scheme cases (para 3.1), or check your cash conditions.</li>
          <li>It does not read your broker report: it adds the figures you enter, on the basis you chose.</li>
        </UL>

        <H2>Edition and the Income-tax Act, 2025</H2>
        <P>
          {METHOD_LINE} The Note describes itself as the last edition of the Guidance Note under the Income-tax Act, 1961. It says that for tax years governed
          by the Income-tax Act, 2025 the tax-audit provision is section 63, that previous years governed by the 1961 Act continue under it, and that ICAI will
          issue guidance on the new framework in due course (closing note after para 13.17 and the Foreword). This page follows the Note and does not cover
          section 63.
        </P>

        <H2>TradeQut&apos;s tax report and this calculator</H2>
        <P>
          TradeQut&apos;s India tax report also shows a futures and options turnover figure for a financial year, built from the trades in your journal. It is not
          the same computation as this page. For each closed futures or options trade it takes the absolute profit or loss before the fees recorded on the trade,
          and for each options trade it adds the premium on the sale leg, with no choice for a premium that is already in the profit. It compares the total with a
          fixed ₹10 crore and does not ask about the cash conditions. This calculator takes the figures you give it and shows both premium
          readings and both limits. Treat the report&apos;s figure as an estimate to discuss with your chartered accountant; see the{' '}
          <A to="/fo-trading-journal">F&amp;O trading journal</A> page for what TradeQut records.
        </P>
        <P>
          Related: <A to="/resources/fo-charges-rates">F&amp;O charges and STT rates</A>,{' '}
          <A to="/blog/zerodha-tradebook-pnl">reading the Zerodha tradebook P&amp;L</A> and <A to="/blog/fo-trading-charges-india">F&amp;O charges in India</A>.
        </P>

        <Faq items={FAQ} />
        <Sources
          items={[
            {
              label: 'ICAI, Guidance Note on Tax Audit under Section 44AB of the Income-tax Act, 1961 (Revised 2026), 11th edition, Direct Taxes Committee: publication page (the download needs an ICAI sign-in)',
              url: 'https://publication.icai.org/publication/968',
              checked: '2026-11-15',
            },
            {
              label: 'Zerodha Support: How is turnover calculated in Tax P&L and how to determine audit requirements? (undated)',
              url: 'https://support.zerodha.com/category/console/reports/taxation/articles/how-is-turnover-calculated-in-tax-p-l-and-how-do-i-know-if-i-need-an-audit',
              checked: '2026-11-15',
            },
          ]}
        />
        <Disclaimer>
          This page explains the ICAI method for educational purposes and is not tax advice. Confirm with a chartered accountant before relying on any figure.
          TradeQut is a journaling and analytics tool, not a SEBI-registered investment adviser or research analyst, and nothing here is a recommendation to buy or
          sell any security. Rules and limits change; check the Note and the Income-tax Act in force for your year.
        </Disclaimer>
        <SignupCta />
      </div>
    </ContentPageShell>
  );
}
