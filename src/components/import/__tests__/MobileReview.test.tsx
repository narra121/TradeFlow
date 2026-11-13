import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { NormalizedTrade } from '@/types/import';
import { makeRows, parseNumberCell } from '@/lib/import/rows';
import { MobileReview } from '../MobileReview';

const trade = (p: Partial<NormalizedTrade> = {}): NormalizedTrade => ({
  symbol: 'EURUSD', side: 'BUY', quantity: 10, entryPrice: 100, exitPrice: 105, openDate: '2026-10-02T03:45:00.000Z', closeDate: '2026-10-02T06:10:00.000Z',
  outcome: 'TP', pnl: 48.5, stopLoss: null, takeProfit: null, tags: [], assetClass: 'forex', fees: 1.5, grossPnl: 50, externalId: 'a', importSource: 'generic_csv', ...p,
});

describe('parseNumberCell', () => {
  it('reads a comma as a thousands separator and an empty cell as NaN, as the desktop grid does', () => {
    expect(parseNumberCell('1,234.5')).toBe(1234.5);
    expect(parseNumberCell('  ')).toBeNaN();
    expect(parseNumberCell('')).toBeNaN();
    expect(parseNumberCell('0')).toBe(0);
  });
});

describe('MobileReview edit sheet', () => {
  const open = async (onEdit = vi.fn()) => {
    const rows = makeRows([trade()], 'f.csv');
    const user = userEvent.setup();
    render(<MobileReview rows={rows} onInclude={vi.fn()} onEdit={onEdit} />);
    await user.click(screen.getByRole('button', { name: 'Edit EURUSD' }));
    return { user, onEdit, key: rows[0].key };
  };

  it('clearing Fees or Net P&L flags the cell instead of saving 0', async () => {
    const { user, onEdit, key } = await open();
    await user.clear(screen.getByLabelText('Fees'));
    await user.clear(screen.getByLabelText('Net P&L'));
    expect(screen.getByLabelText('Fees')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Net P&L')).toHaveAttribute('aria-invalid', 'true');
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(onEdit).toHaveBeenCalledWith(key, 'fees', Number.NaN);
    expect(onEdit).toHaveBeenCalledWith(key, 'pnl', Number.NaN);
  });

  it('a cell left alone is not edited, and a typed number is saved as typed', async () => {
    const { user, onEdit, key } = await open();
    await user.clear(screen.getByLabelText('Net P&L'));
    await user.type(screen.getByLabelText('Net P&L'), '1200.5');
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(key, 'pnl', 1200.5);
  });
});
