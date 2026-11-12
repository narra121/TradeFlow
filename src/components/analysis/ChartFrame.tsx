import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';

interface ChartFrameProps {
  title: string;
  description?: string;
  /** Text summary announced for the chart. */
  summary: string;
  chart: React.ReactNode;
  /** Table alternative: header cells and rows of already formatted text. */
  table: { head: string[]; rows: string[][] };
}

/** Panel with a chart and its `View as table` alternative (every chart has one). */
export function ChartFrame({ title, description, summary, chart, table }: ChartFrameProps) {
  const [asTable, setAsTable] = useState(false);
  return (
    <Panel
      title={title}
      description={description}
      actions={
        <Button type="button" variant="ghost" size="sm" aria-pressed={asTable} onClick={() => setAsTable((v) => !v)}>
          {asTable ? 'View as chart' : 'View as table'}
        </Button>
      }
    >
      {asTable ? (
        <div className="max-h-72 overflow-auto rounded-md border border-border">
          <table className="w-full text-[13px]">
            <caption className="sr-only">{title}</caption>
            <thead className="sticky top-0 bg-card">
              <tr className="text-left text-xs text-muted-foreground">
                {table.head.map((h, i) => <th key={h} scope="col" className={i === 0 ? 'h-8 px-3' : 'px-3 text-right'}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r) => (
                <tr key={r[0]} className="border-t border-border/60">
                  {r.map((c, i) => i === 0 ? <th key={i} scope="row" className="h-9 px-3 text-left font-normal">{c}</th> : <td key={i} className="px-3 text-right font-mono tabular-nums">{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div role="img" aria-label={summary}>{chart}</div>
      )}
    </Panel>
  );
}
