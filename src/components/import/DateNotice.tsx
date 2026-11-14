import { CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { appTimeZone } from '@/lib/appTimeZone';
import { switchableReadings, type DateReading } from '@/lib/import/dates';
import { missingTimeCounts, type ReviewRow } from '@/lib/import/rows';
import { formatCount } from '@/lib/format';

const ORDER_LABEL = { DMY: 'day/month', MDY: 'month/day' } as const;

const WHY: Record<DateReading['source'], string> = {
  evidence: 'the only order that fits these rows',
  region: 'the usual order in your time zone',
  default: 'the screenshot does not show which',
};

function day(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: appTimeZone() }).format(d);
}

interface DateNoticeProps {
  rows: ReviewRow[];
  readOnly?: boolean;
  onSwitch: (shot: number) => void;
}

/** Screenshot review: how day and month were read (with a switch when either order is possible) and rows missing an open or close time. */
export function DateNotice({ rows, readOnly, onSwitch }: DateNoticeProps) {
  const readings = switchableReadings(rows);
  const missing = missingTimeCounts(rows);
  const live = rows.filter((r) => r.included && !r.saved);
  const noYear = live.filter((r) => r.dates?.filled === 'year').length;
  const noDate = live.filter((r) => r.dates?.filled === 'date').length;
  if (readings.length === 0 && missing.open === 0 && missing.close === 0 && noYear === 0 && noDate === 0) return null;
  const rowsWord = (n: number) => `${formatCount(n)} ${n === 1 ? 'row' : 'rows'}`;
  return (
    <div role="status" aria-label="How dates were read" className="space-y-1.5 rounded-md border border-warning/40 bg-warning/5 px-3 py-2 text-13">
      {readings.map((r) => {
        const other = r.order === 'DMY' ? 'MDY' : 'DMY';
        return (
          <p key={r.shot} className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <CalendarClock className="h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
            <span>
              Screenshot {r.shot}: dates read as <span className="font-medium">{ORDER_LABEL[r.order]}</span>
              {r.example && day(r.example.iso) && (
                <>
                  {' '}— <span className="font-mono">{r.example.raw}</span> is {day(r.example.iso)}
                </>
              )}
              <span className="text-muted-foreground"> ({WHY[r.source]})</span>
            </span>
            <Button type="button" size="sm" variant="outline" className="h-7" disabled={readOnly} onClick={() => onSwitch(r.shot)}>
              Switch to {ORDER_LABEL[other]}
            </Button>
          </p>
        );
      })}
      {missing.open > 0 && (
        <p className="text-warning">Open time not in the screenshot for {rowsWord(missing.open)} — set it or keep the close time. Until then the open time is the close time.</p>
      )}
      {missing.close > 0 && (
        <p className="text-warning">Close time not in the screenshot for {rowsWord(missing.close)} — set it or keep the open time. Until then the close time is the open time.</p>
      )}
      {noYear > 0 && <p>{rowsWord(noYear)} had no year in the screenshot: the most recent past date is used. Check rows near New Year.</p>}
      {noDate > 0 && <p>{rowsWord(noDate)} had only a time in the screenshot: today’s date is used.</p>}
    </div>
  );
}
