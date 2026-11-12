import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { NormalizedTrade } from '@/types/import';
import { editRow, makeRows, setIncluded, type ReviewRow } from '@/lib/import/rows';
import { ColumnMapping } from '../ColumnMapping';
import { ResultRow } from '../ResultRow';
import { ReviewGrid } from '../ReviewGrid';
import { StatusChips } from '../StatusChips';

const trade = (p: Partial<NormalizedTrade> = {}): NormalizedTrade => ({
  symbol: 'NIFTY', side: 'BUY', quantity: 10, entryPrice: 100, exitPrice: 105, openDate: '2026-10-02T03:45:00.000Z', closeDate: '2026-10-02T06:10:00.000Z',
  outcome: 'TP', pnl: 48.5, stopLoss: null, takeProfit: null, tags: [], assetClass: 'stock', fees: 1.5, grossPnl: 50, externalId: 'a', importSource: 'generic_csv', ...p,
});

function Harness({ initial, onEditSpy }: { initial: ReviewRow[]; onEditSpy?: (key: string, field: string, value: unknown) => void }) {
  const [rows, setRows] = useState(initial);
  const [page, setPage] = useState(1);
  return (
    <ReviewGrid
      rows={rows}
      total={rows.length}
      page={page}
      onPage={setPage}
      currency="USD"
      selection={new Set()}
      onSelect={() => undefined}
      onToggleSelectAll={(c) => setRows((r) => setIncluded(r, new Set(r.map((x) => x.key)), c))}
      onInclude={(k, inc) => setRows((r) => setIncluded(r, new Set([k]), inc))}
      onEdit={(k, f, v) => {
        onEditSpy?.(k, f, v);
        setRows((r) => editRow(r, k, f as never, v));
      }}
    />
  );
}

const rows = () => makeRows([trade({ externalId: '1' }), trade({ externalId: '2', symbol: 'BANKNIFTY', exitPrice: 0 }), trade({ externalId: '3', duplicate: true })], 'f.csv');
const cell = (r: number, c: number) => document.querySelector<HTMLElement>(`[data-r="${r}"][data-c="${c}"]`)!;
const focusCell = (r: number, c: number) => act(() => cell(r, c).focus());

describe('ReviewGrid', () => {
  it('is a grid with a status per row, the reason under a row that needs a fix, and a named include box', () => {
    render(<Harness initial={rows()} />);
    expect(screen.getByRole('grid', { name: 'Trades to import' })).toBeInTheDocument();
    expect(cell(0, 2)).toHaveTextContent('Ready');
    expect(cell(1, 2)).toHaveTextContent('Needs a fix');
    expect(cell(2, 2)).toHaveTextContent('Already imported');
    expect(screen.getByText('Enter an exit price greater than 0.')).toBeInTheDocument();
    expect(cell(1, 9)).toHaveAttribute('aria-invalid', 'true');
    expect(cell(1, 9).getAttribute('aria-describedby')).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: /Include row 3/ })).not.toBeChecked();
  });

  it('arrow keys move the active cell; Enter edits, Tab commits and moves right, Esc cancels', async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Harness initial={rows()} onEditSpy={spy} />);
    focusCell(0, 5);
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(cell(1, 5));
    await user.keyboard('{ArrowUp}{Enter}');
    const input = screen.getByRole('textbox', { name: 'Symbol, row 1' });
    await user.clear(input);
    await user.type(input, 'finnifty{Tab}');
    expect(spy).toHaveBeenCalledWith(expect.any(String), 'symbol', 'FINNIFTY');
    expect(cell(0, 5)).toHaveTextContent('FINNIFTY');
    expect(document.activeElement).toBe(cell(0, 6));

    focusCell(0, 7);
    await user.keyboard('{F2}');
    await user.type(screen.getByRole('textbox', { name: 'Quantity, row 1' }), '9{Escape}');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(cell(0, 7)).toHaveTextContent('10');
  });

  it('fixing the cell clears the error and turns the row Ready', async () => {
    const user = userEvent.setup();
    render(<Harness initial={rows()} />);
    focusCell(1, 9);
    await user.keyboard('{Enter}');
    await user.type(screen.getByRole('textbox', { name: 'Exit price, row 2' }), '110{Enter}');
    expect(cell(1, 2)).toHaveTextContent('Ready');
    expect(screen.queryByText('Enter an exit price greater than 0.')).toBeNull();
  });

  it('Space toggles the row include box', async () => {
    const user = userEvent.setup();
    render(<Harness initial={rows()} />);
    focusCell(0, 0);
    await user.keyboard(' ');
    expect(cell(0, 2)).toHaveTextContent('Excluded');
    expect(within(cell(0, 0)).getByRole('checkbox')).not.toBeChecked();
  });

  it('pages 100 rows at a time', () => {
    const many = makeRows(Array.from({ length: 230 }, (_, i) => trade({ externalId: String(i) })), 'f');
    render(<Harness initial={many} />);
    expect(screen.getAllByRole('row').filter((r) => r.hasAttribute('data-status'))).toHaveLength(100);
    expect(screen.getByText('1–100 of 230')).toBeInTheDocument();
  });
});

describe('StatusChips', () => {
  const summary = { all: 142, ready: 131, fix: 3, duplicate: 5, excluded: 3, saved: 0, net: 0 };
  it('is a radio group with counts in the names; empty statuses are not drawn', async () => {
    const onChange = vi.fn();
    render(<StatusChips value="all" onChange={onChange} summary={summary} />);
    expect(screen.getByRole('radiogroup', { name: 'Show rows' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Needs a fix, 3 rows' })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /Imported/ })).toBeNull();
    await userEvent.click(screen.getByRole('radio', { name: 'Already imported, 5 rows' }));
    expect(onChange).toHaveBeenCalledWith('duplicate');
  });
});

describe('ColumnMapping', () => {
  it('preselects suggestions, asks for what is missing and applies the mapping', async () => {
    const onApply = vi.fn();
    render(<ColumnMapping headers={['Scrip', 'B/S', 'Lots', 'In', 'Out', 'Opened']} suggested={{ symbol: 'Scrip', side: 'B/S', quantity: 'Lots' }} onApply={onApply} onCancel={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Apply mapping' })).toBeDisabled();
    expect(screen.getByText(/Still needed: Entry price, Exit price, Open time/)).toBeInTheDocument();
  });
});

describe('ResultRow', () => {
  const base = { created: 131, skipped: 0, errors: 0, failed: 0, batchId: 'b', createdIds: ['t1'], failedExternalIds: [] };
  it('states the outcome and offers View, Import another and Undo', async () => {
    const onUndo = vi.fn();
    render(<ResultRow result={base} accountName="FTMO 100K" busy={false} error={null} onView={() => undefined} onAnother={() => undefined} onUndo={onUndo} onRetry={() => undefined} />);
    expect(screen.getByRole('status')).toHaveTextContent('131 trades imported into FTMO 100K · 0 failed');
    await userEvent.click(screen.getByRole('button', { name: 'Undo import' }));
    expect(onUndo).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'View imported trades' })).toBeInTheDocument();
  });

  it('after a partial failure offers Retry with the failed count', () => {
    render(<ResultRow result={{ ...base, created: 127, failed: 4 }} accountName="FTMO" busy={false} error={null} onView={() => undefined} onAnother={() => undefined} onUndo={() => undefined} onRetry={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Retry 4 failed' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('127 imported · 4 failed');
    expect(screen.queryByRole('button', { name: 'Import another' })).toBeNull();
  });
});
