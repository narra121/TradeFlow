import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { chatTableView } from '@/lib/ai/chatTable';
import { plural } from '@/lib/evidence';
import { cn } from '@/lib/utils';
import type { QueryResult } from '@/types/analysis';

interface ChatTableProps {
  table: QueryResult;
  /** 1-based: the answer refers to "table 1" */
  n: number;
  currency?: string | null;
  onTrade: (id: string, ids?: string[]) => void;
}

const TONE = { profit: 'text-profit', loss: 'text-loss' } as const;

function ChatTable({ table, n, currency, onTrade }: ChatTableProps) {
  const v = useMemo(() => chatTableView(table, currency), [table, currency]);
  const id = useId();
  const removes = table.columns[0] === 'measure' && table.columns.includes('replay');
  const ids = v.tradeIds;
  const scroller = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const measure = () => setWide(el.scrollWidth > el.clientWidth + 1);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [v]);
  return (
    <div className="space-y-1">
      {/* A focusable region so a table wider than a phone can be scrolled with the keyboard. */}
      <div ref={scroller} role="region" aria-labelledby={id} tabIndex={0} className="max-w-full overflow-x-auto rounded-md border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <table className="w-full min-w-max border-collapse text-13">
          <caption id={id} className="px-2 py-1.5 sm:px-3 text-left text-xs text-muted-foreground">
            <span className="font-semibold text-foreground-soft">Table {n}</span>
            {v.sample ? ` · ${v.sample}` : ''}
          </caption>
          <thead>
            <tr className="border-y border-border bg-muted/50">
              {v.headers.map((h, i) => (
                <th key={i} scope="col" className={cn('whitespace-nowrap px-2 py-1.5 sm:px-3 text-xs font-medium text-muted-foreground', h.numeric ? 'text-right' : 'text-left')}>
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {v.rows.map((r, ri) => (
              <tr key={ri} className="border-b border-border last:border-b-0">
                {r.cells.map((c, ci) => {
                  const body = ci === 0 && r.tradeId ? (
                    <button type="button" onClick={() => onTrade(r.tradeId!, ids)} className="text-primary underline-offset-2 hover:underline">
                      {c.text}
                    </button>
                  ) : (
                    c.text
                  );
                  const cls = cn('whitespace-nowrap px-2 py-1.5 sm:px-3', c.numeric ? 'text-right font-mono tabular-nums' : 'text-left', c.tone && TONE[c.tone]);
                  return ci === 0 ? (
                    <th key={ci} scope="row" className={cn(cls, 'font-normal')}>{body}</th>
                  ) : (
                    <td key={ci} className={cls}>{body}</td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {wide && <p className="text-xs text-muted-foreground">Scroll the table sideways for more columns.</p>}
      {(v.note || ids.length > 0) && (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {v.note && <p className="max-w-prose">{v.note}</p>}
          {ids.length > 0 && !v.perTrade && (
            <button type="button" onClick={() => onTrade(ids[0], ids)} className="inline-flex h-6 items-center text-primary underline-offset-2 hover:underline [@media(pointer:coarse)]:h-11">
              {removes ? `View the ${plural(ids.length, 'trade')} the rule removes` : `View ${plural(ids.length, 'trade')}`} →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** The tool results under an answer, drawn by the app from the done frame; the model never types their figures. */
export function ChatTables({ tables, currency, onTrade }: { tables: QueryResult[]; currency?: string | null; onTrade: ChatTableProps['onTrade'] }) {
  if (!tables.length) return null;
  return (
    <div className="space-y-3 pt-1">
      {tables.map((t, i) => (
        <ChatTable key={i} table={t} n={i + 1} currency={currency} onTrade={onTrade} />
      ))}
    </div>
  );
}
