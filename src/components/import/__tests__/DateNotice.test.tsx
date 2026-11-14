import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { patchUiState, resetUiStateCache } from '@/hooks/useUiState';
import { switchDateOrder, type RowDates } from '@/lib/import/dates';
import { editRow, makeRows, type ReviewRow } from '@/lib/import/rows';
import type { NormalizedTrade } from '@/types/import';
import { DateNotice } from '../DateNotice';
import { ReviewGrid } from '../ReviewGrid';
import { MobileReview } from '../MobileReview';

const trade = (p: Partial<NormalizedTrade> = {}): NormalizedTrade => ({
  symbol: 'XAUUSD', side: 'BUY', quantity: 0.92, entryPrice: 4220.8, exitPrice: 4221.2, openDate: '2025-12-03T03:11:09.075Z', closeDate: '2025-12-03T03:11:09.075Z',
  outcome: 'TP', pnl: 32.2, stopLoss: null, takeProfit: null, tags: [], assetClass: 'stock', fees: 0, grossPnl: 32.2, externalId: 'x', importSource: 'ai_screenshot', ...p,
});
const dates: RowDates = { shot: 1, order: 'DMY', source: 'default', canSwitch: true, openRaw: '', closeRaw: '03/12/2025 08:41:09.075', openMissing: true, closeMissing: false };
const cTraderRows = (): ReviewRow[] => makeRows([trade({ externalId: '1' }), trade({ externalId: '2', symbol: 'DJIUSD' })], 'Screenshot 1').map((r) => ({ ...r, dates }));

function Harness({ initial }: { initial: ReviewRow[] }) {
  const [rows, setRows] = useState(initial);
  return (
    <>
      <DateNotice rows={rows} onSwitch={(shot) => setRows((r) => switchDateOrder(r, shot))} />
      <ReviewGrid
        rows={rows}
        total={rows.length}
        page={1}
        onPage={() => undefined}
        selection={new Set()}
        onSelect={() => undefined}
        onToggleSelectAll={() => undefined}
        onInclude={() => undefined}
        onEdit={(k, f, v) => setRows((r) => editRow(r, k, f, v))}
      />
    </>
  );
}

beforeEach(() => patchUiState({ timeZone: 'Asia/Kolkata' }));
afterEach(() => {
  localStorage.clear();
  resetUiStateCache();
});

describe('DateNotice', () => {
  it('says how the dates were read, with an example, and the switch re-reads the cells as month/day', async () => {
    render(<Harness initial={cTraderRows()} />);
    const notice = screen.getByRole('status', { name: 'How dates were read' });
    expect(notice).toHaveTextContent('Screenshot 1: dates read as day/month — 03/12/2025 08:41:09.075 is 3 Dec 2025 (the screenshot does not show which)');
    await userEvent.click(screen.getByRole('button', { name: 'Switch to month/day' }));
    expect(notice).toHaveTextContent('dates read as month/day — 03/12/2025 08:41:09.075 is 12 Mar 2025');
    expect(screen.getByRole('button', { name: 'Switch to day/month' })).toBeInTheDocument();
  });

  it('flags rows with no open time in the notice, the Opened cell and a note under the row', () => {
    render(<Harness initial={cTraderRows()} />);
    expect(screen.getByText('Open time not in the screenshot for 2 rows — set it or keep the close time. Until then the open time is the close time.')).toBeInTheDocument();
    expect(screen.getAllByText('Open time not in the screenshot — set it or keep the close time.')).toHaveLength(2);
    expect(document.querySelectorAll('[data-missing="true"]')).toHaveLength(2);
    expect(screen.getAllByRole('row').filter((r) => r.getAttribute('data-status') === 'ready')).toHaveLength(2);
  });

  it('says nothing when the order is certain and every row has both times', () => {
    const rows = makeRows([trade()], 'Screenshot 1').map((r) => ({ ...r, dates: { ...dates, canSwitch: false, openMissing: false } }));
    const { container } = render(<DateNotice rows={rows} onSwitch={() => undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('says when a year or a date had to be filled in', () => {
    const rows = makeRows([trade({ externalId: '1' }), trade({ externalId: '2' })], 'Screenshot 1').map((r, i) => ({ ...r, dates: { ...dates, canSwitch: false, openMissing: false, filled: i === 0 ? ('year' as const) : ('date' as const) } }));
    render(<DateNotice rows={rows} onSwitch={() => undefined} />);
    expect(screen.getByText('1 row had no year in the screenshot: the most recent past date is used. Check rows near New Year.')).toBeInTheDocument();
    expect(screen.getByText('1 row had only a time in the screenshot: today’s date is used.')).toBeInTheDocument();
  });

  it('the phone review shows the missing open time under the card', () => {
    render(<MobileReview rows={cTraderRows()} onInclude={() => undefined} onEdit={() => undefined} />);
    expect(screen.getAllByText('Open time not in the screenshot — set it or keep the close time.')).toHaveLength(2);
  });
});
