import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ListSummary } from '@/lib/tradeFilters';
import type { Trade } from '@/types/trade';

vi.mock('@/hooks/useOnline', () => ({ useOnline: () => true }));

import { BulkBar } from '../BulkBar';

const noop = () => {};
const trades = [{ id: '1', symbol: 'EURUSD', pnl: 10, accountId: 'a' }, { id: '2', symbol: 'GBPUSD', pnl: -5, accountId: 'a' }] as unknown as Trade[];

describe('BulkBar', () => {
  it('puts Clear, Export and Delete before the pickers, so a long bar never cuts the destructive action off (L22-028)', () => {
    render(
      <BulkBar
        inline
        selectedTrades={trades}
        summary={{ count: 2, winRate: 0.5, byCurrency: [], noAccount: 0 } as ListSummary}
        matchingCount={36}
        options={{ strategies: [], sessions: [], markets: [], mistakes: [], tags: [], rules: [], accounts: [] }}
        progress={null}
        canUndo={false}
        failedCount={0}
        onSelectAllMatching={noop}
        onClear={noop}
        onApply={noop}
        onUndo={noop}
        onRetryFailed={noop}
        onExport={noop}
        onDelete={() => Promise.resolve()}
      />,
    );
    const names = screen.getAllByRole('button').map((b) => b.textContent?.trim());
    const at = (n: string) => names.findIndex((x) => x === n);
    expect(at('Delete')).toBeGreaterThan(-1);
    expect(at('Delete')).toBeLessThan(at('Mistakes'));
    expect(at('Export')).toBeLessThan(at('Mistakes'));
    expect(at('Clear')).toBeLessThan(at('Export'));
  });
});
