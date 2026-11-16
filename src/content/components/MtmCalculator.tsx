import { useMemo, useState } from 'react';
import { DecimalInput, DirectionRadios, FormulaDisclosure, LiveResult, calcLabelClass, parseDecimal } from '@/components/content/calculator';
import { formatMoney } from '@/lib/format';
import { computeMtm, MAX_SETTLEMENTS, type Direction } from '@/lib/pnl/mtm';
import { cn } from '@/lib/utils';
import { Table } from './ArticleParts';

const money = (v: number) => formatMoney(v, 'INR', { sign: true });
const price = (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 });

function Signed({ value }: { value: number }) {
  return <span className={cn('num', value > 0 && 'text-profit', value < 0 && 'text-loss')}>{money(value)}</span>;
}

/** Inputs start as the worked example in the article, so the first render matches the table above it. */
export function MtmCalculator() {
  const [direction, setDirection] = useState<Direction>('long');
  const [quantityText, setQuantityText] = useState('100');
  const [entryText, setEntryText] = useState('24150');
  const [settlementTexts, setSettlementTexts] = useState(['24185.5', '24120.25', '24060', '', '']);
  const [exitText, setExitText] = useState('24095.5');

  const result = useMemo(
    () =>
      computeMtm({
        direction,
        quantity: parseDecimal(quantityText),
        entryPrice: parseDecimal(entryText),
        settlements: settlementTexts.filter((t) => t.trim() !== '').map(parseDecimal),
        exitPrice: parseDecimal(exitText),
      }),
    [direction, quantityText, entryText, settlementTexts, exitText],
  );

  const summary = result.status === 'ok'
    ? `Realised P&L ${money(result.realised)}. The ${result.rows.length} daily entries add up to the same figure.`
    : result.error;

  return (
    <section aria-label="MTM calculator" className="panel mb-8 p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <DirectionRadios value={direction} onChange={setDirection} />
        </div>
        <div>
          <label htmlFor="mtm-quantity" className={calcLabelClass}>
            Quantity (lots × lot size)
          </label>
          <DecimalInput id="mtm-quantity" value={quantityText} onChange={setQuantityText} />
        </div>
        <div>
          <label htmlFor="mtm-entry" className={calcLabelClass}>
            Entry price
          </label>
          <DecimalInput id="mtm-entry" value={entryText} onChange={setEntryText} />
        </div>
        <div>
          <label htmlFor="mtm-exit" className={calcLabelClass}>
            Exit price
          </label>
          <DecimalInput id="mtm-exit" value={exitText} onChange={setExitText} />
        </div>
      </div>

      <fieldset className="mt-4">
        <legend className={calcLabelClass}>Daily settlement prices (up to {MAX_SETTLEMENTS})</legend>
        <p className="mb-3 text-xs text-muted-foreground">
          One for each day-end the position is still open, oldest first; blank days are skipped. The exit comes after the last one.
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {settlementTexts.map((text, i) => (
            <div key={i}>
              <label htmlFor={`mtm-settlement-${i + 1}`} className="mb-1.5 block text-xs text-muted-foreground">
                Day {i + 1}
              </label>
              <DecimalInput
                id={`mtm-settlement-${i + 1}`}
                value={text}
                onChange={(t) => setSettlementTexts((prev) => prev.map((p, j) => (j === i ? t : p)))}
              />
            </div>
          ))}
        </div>
      </fieldset>

      <div className="mt-6">
        <h3 className="mb-3 text-base font-semibold text-foreground">Result</h3>
        {result.status === 'ok' ? (
          <>
            <Table
              caption="Amounts in ₹, before charges"
              head={['Day', 'Price', 'P&L from entry', 'Day’s MTM', 'MTM total so far']}
              rows={result.rows.map((r) => [
                r.kind === 'exit' ? `Exit, day ${r.day}` : `Day ${r.day}`,
                <span key="p" className="num">
                  {price(r.price)}
                </span>,
                <Signed key="e" value={r.fromEntry} />,
                <Signed key="m" value={r.mtm} />,
                <Signed key="t" value={r.ledgerTotal} />,
              ])}
            />
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-muted-foreground">Realised P&amp;L at exit</dt>
                <dd className="text-base font-semibold">
                  <Signed value={result.realised} />
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Sum of the daily MTM entries</dt>
                <dd className="text-base font-semibold">
                  <Signed value={result.rows[result.rows.length - 1].ledgerTotal} />
                </dd>
              </div>
            </dl>
          </>
        ) : (
          <p className="text-sm text-foreground-soft">{result.error}</p>
        )}
        <FormulaDisclosure>
          <p>P&amp;L from entry = (price − entry price) × quantity, sign reversed for a short position.</p>
          <p>Day’s MTM = (price − previous reference) × quantity, where the reference is the entry price on day 1 and the previous settlement after that.</p>
          <p>Realised P&amp;L = (exit price − entry price) × quantity. Each row is rounded to 2 decimals so the rows add up to the paisa.</p>
        </FormulaDisclosure>
        <LiveResult text={summary} />
      </div>
    </section>
  );
}
