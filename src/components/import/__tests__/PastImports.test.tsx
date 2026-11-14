import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rememberBatchFile, type ImportBatch } from '@/lib/import/batches';
import { PastImports } from '../PastImports';

let state: { data?: ImportBatch[]; isFetching: boolean; isError: boolean } = { isFetching: false, isError: false };
const query = vi.fn();
const refetch = vi.fn();
vi.mock('@/store/api/importApi', () => ({
  useGetImportBatchesQuery: (arg: unknown, opts: unknown) => {
    query(arg, opts);
    return { ...state, refetch };
  },
}));

const accounts = [{ id: 'a1', name: 'FTMO 100K' }, { id: 'a2', name: 'Zerodha F&O' }];
const sources = [{ id: 'zerodha' as const, name: 'Zerodha (Console tradebook)', assetClasses: [], fileTypes: [], howToExport: '', sampleColumns: [] }];
const batch = (p: Partial<ImportBatch> = {}): ImportBatch => ({ batchId: 'b1', accountId: 'a1', source: 'zerodha', importedAt: '2026-10-28T10:00:00.000Z', count: 131, from: '2026-10-01T00:00:00.000Z', to: '2026-10-28T00:00:00.000Z', ...p });

beforeEach(() => {
  state = { isFetching: false, isError: false };
  query.mockReset();
  refetch.mockReset();
  localStorage.clear();
});

describe('PastImports', () => {
  it('stays closed and makes no request until it is opened', async () => {
    render(<PastImports accounts={accounts} sources={sources} onView={() => undefined} />);
    expect(query.mock.calls[0][1]).toEqual({ skip: true });
    await userEvent.click(screen.getByRole('button', { name: 'Past imports' }));
    expect(query.mock.calls.at(-1)?.[1]).toEqual({ skip: false });
    expect(query.mock.calls.at(-1)?.[0]).toEqual({ accountIds: ['a1', 'a2'] });
  });

  it('lists date, remembered file, source, account and trade count, and opens the import', async () => {
    rememberBatchFile('b1', 'tradebook-oct.csv');
    state = { data: [batch(), batch({ batchId: 'b2', source: 'ai_screenshot', accountId: 'a2', count: 1 })], isFetching: false, isError: false };
    const onView = vi.fn();
    render(<PastImports accounts={accounts} sources={sources} onView={onView} />);
    await userEvent.click(screen.getByRole('button', { name: 'Past imports' }));
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('tradebook-oct.csv');
    expect(rows[0]).toHaveTextContent('Zerodha');
    expect(rows[0]).toHaveTextContent('FTMO 100K');
    expect(rows[0]).toHaveTextContent('131');
    expect(rows[1]).toHaveTextContent('Screenshots');
    expect(rows[1]).toHaveTextContent('Zerodha F&O');
    expect(screen.getByRole('button', { name: /, 1 trade$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /, 131 trades$/ })).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: /View trades/ })[0]);
    expect(onView).toHaveBeenCalledWith(expect.objectContaining({ batchId: 'b1' }));
  });

  it('says so when there are no imports, and offers Retry when loading fails', async () => {
    state = { data: [], isFetching: false, isError: false };
    const { unmount } = render(<PastImports accounts={accounts} sources={sources} onView={() => undefined} />);
    await userEvent.click(screen.getByRole('button', { name: 'Past imports' }));
    expect(screen.getByText(/No imports yet/)).toBeInTheDocument();
    unmount();

    state = { isFetching: false, isError: true };
    render(<PastImports accounts={accounts} sources={sources} onView={() => undefined} />);
    await userEvent.click(screen.getByRole('button', { name: 'Past imports' }));
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalled();
  });
});
