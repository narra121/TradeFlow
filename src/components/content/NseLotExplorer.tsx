import { useId, useMemo, useState, type ChangeEvent } from 'react';
import { Search } from 'lucide-react';
import { CalcLayout, DecimalInput, FormulaDisclosure, LiveResult, calcLabelClass, parseDecimal } from '@/components/content/calculator';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { cn } from '@/lib/utils';
import { NSE_LOT_FILE_URL } from '@/content/nse-lot-circulars';
import { changesLater, contractValue, firstLot, formatDay, parseLotFile, searchRows, type LotFile } from '@/lib/nseLotFile';

type Kind = 'indices' | 'stocks';

interface Loaded {
  fileName: string;
  file: LotFile;
  /** YYYY-MM-DD on this device when the file was loaded. */
  loadedOn: string;
}

function todayIso(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

const buttonClass =
  'inline-flex h-9 max-md:h-11 items-center rounded-md border border-border-strong px-3 text-sm font-medium text-foreground hover:bg-secondary';

/** Search and month-by-month lot table over NSE's own file, read from the visitor's device; TradeQut holds no copy of the table. */
export function NseLotExplorer() {
  const uid = useId();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState('');
  const [inputKey, setInputKey] = useState(0);
  const [kind, setKind] = useState<Kind>('indices');
  const [query, setQuery] = useState('');

  const section = loaded?.file[kind];
  const shown = useMemo(() => (section ? searchRows(section.rows, query) : []), [section, query]);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    try {
      setLoaded({ fileName: picked.name, file: parseLotFile(await picked.text()), loadedOn: todayIso() });
      setError('');
    } catch (err) {
      setLoaded(null);
      setError(err instanceof Error ? err.message : 'The file could not be read.');
    }
  }

  function clear() {
    setLoaded(null);
    setError('');
    setQuery('');
    setInputKey((k) => k + 1);
  }

  return (
    <div className="mb-10">
      <ol className="mb-4 list-decimal space-y-3 pl-6 text-foreground-soft">
        <li>
          Download{' '}
          <a href={NSE_LOT_FILE_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4 hover:text-primary/80">
            NSE&apos;s lot file, fo_mktlots.csv
          </a>{' '}
          and save it on your device.
        </li>
        <li>
          <label htmlFor={`${uid}-file`} className="mb-1.5 block">
            Choose the saved file. It is read in this browser tab and is not uploaded or stored.
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <input
              key={inputKey}
              id={`${uid}-file`}
              type="file"
              accept=".csv,text/csv"
              onChange={onFile}
              className="block max-w-full text-sm text-foreground-soft file:mr-3 file:h-9 file:cursor-pointer file:rounded-md file:border file:border-border-strong file:bg-card file:px-3 file:text-sm file:font-medium file:text-foreground hover:file:bg-secondary max-md:file:h-11"
            />
            {loaded && (
              <button type="button" onClick={clear} className={buttonClass}>
                Remove file
              </button>
            )}
          </div>
        </li>
      </ol>

      {error && (
        <p role="alert" className="mb-4 text-sm text-loss">
          {error}
        </p>
      )}

      {loaded && section && (
        <section aria-label="Lot sizes from the file you loaded">
          <p className="mb-4 text-sm text-muted-foreground">
            Source: NSE, fo_mktlots.csv, loaded from your device on {formatDay(loaded.loadedOn)} (file name {loaded.fileName}).{' '}
            <strong className="font-semibold text-foreground">Check the NSE file before trading; lot sizes change.</strong>
          </p>

          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <SegmentedControl<Kind>
              label="Underlying type"
              value={kind}
              onChange={setKind}
              options={[
                { value: 'indices', label: `Indices (${loaded.file.indices.rows.length})` },
                { value: 'stocks', label: `Stocks (${loaded.file.stocks.rows.length})` },
              ]}
            />
            <div className="relative sm:max-w-sm sm:flex-1">
              <label htmlFor={`${uid}-search`} className="sr-only">
                Search by name or symbol
              </label>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                id={`${uid}-search`}
                type="search"
                placeholder="Search by name or symbol"
                autoComplete="off"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-10 max-md:h-11 w-full rounded-md border border-input bg-card pl-10 pr-3 text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <p role="status" className="mb-2 text-sm text-muted-foreground">
            {shown.length} of {section.rows.length} {kind === 'indices' ? 'indices' : 'stocks'}
          </p>

          {shown.length === 0 ? (
            <p className="text-foreground-soft">No underlying matches &ldquo;{query}&rdquo;.</p>
          ) : (
            <div role="region" aria-label="Lot sizes by expiry month" tabIndex={0} className="overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th scope="col" className="sticky left-0 z-10 min-w-48 bg-muted px-3 py-2 text-left font-semibold text-foreground">
                      Underlying
                    </th>
                    {section.months.map((m) => (
                      <th key={m} scope="col" className="whitespace-nowrap px-3 py-2 text-right font-semibold text-foreground">
                        {m}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shown.map((row) => {
                    const first = firstLot(row);
                    const flagged = changesLater(row);
                    return (
                      <tr key={`${row.symbol}-${row.name}`} className="border-t border-border/50">
                        <th scope="row" className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-normal">
                          <span className="block font-semibold text-foreground">{row.symbol}</span>
                          <span className="block text-xs text-muted-foreground">{row.name}</span>
                          {flagged && (
                            <span className="mt-1 inline-block rounded border border-warning/40 bg-warning/10 px-1.5 text-xs text-foreground">Changes later</span>
                          )}
                        </th>
                        {row.lots.map((lot, i) => (
                          <td
                            key={section.months[i]}
                            className={cn('num whitespace-nowrap px-3 py-2 text-right', lot !== null && lot !== first ? 'bg-warning/10 font-semibold text-foreground' : 'text-muted-foreground')}
                          >
                            {lot === null ? '' : lot.toLocaleString('en-IN')}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            A blank cell means NSE lists no contract for that month. &ldquo;Changes later&rdquo; marks an underlying whose lot size is not the same in every
            listed month; the highlighted cells differ from its first month.
          </p>
        </section>
      )}
    </div>
  );
}

export function ContractValueCalculator() {
  const [lotText, setLotText] = useState('');
  const [priceText, setPriceText] = useState('');
  const lot = parseDecimal(lotText);
  const price = parseDecimal(priceText);
  const value = lot > 0 && price > 0 ? contractValue(price, lot) : null;
  const text = value === null ? 'Enter a lot size and a price.' : `Contract value ₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}.`;

  return (
    <CalcLayout
      inputs={
        <>
          <div>
            <label htmlFor="lot-size-input" className={calcLabelClass}>
              Lot size (units per lot)
            </label>
            <DecimalInput id="lot-size-input" value={lotText} onChange={setLotText} />
          </div>
          <div>
            <label htmlFor="lot-price-input" className={calcLabelClass}>
              Price per unit (₹), typed by you
            </label>
            <DecimalInput id="lot-price-input" value={priceText} onChange={setPriceText} />
          </div>
        </>
      }
      result={
        <>
          <h4 className="mb-4 text-base font-semibold text-foreground">Result</h4>
          {value === null ? (
            <p className="text-sm text-foreground-soft">Type a lot size from the table above or from NSE&apos;s file, and a price.</p>
          ) : (
            <p className="num text-2xl font-semibold text-foreground">₹{value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
          )}
          <FormulaDisclosure>
            <p>Contract value = price × lot size.</p>
            <p>TradeQut shows no prices and adds no margin: both numbers are the ones you type.</p>
          </FormulaDisclosure>
          <LiveResult text={text} />
        </>
      }
    />
  );
}
