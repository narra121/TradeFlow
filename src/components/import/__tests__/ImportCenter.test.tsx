import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { importFlow } from '@/lib/importFlowStore';
import { makeRows } from '@/lib/import/rows';
import type { NormalizedTrade } from '@/types/import';
import { ImportCenter } from '../ImportCenter';

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const actions = {
  addFiles: vi.fn(),
  reparse: vi.fn(),
  cancelParse: vi.fn(),
  edit: vi.fn(),
  toggle: vi.fn(),
  merge: vi.fn(),
  move: vi.fn(),
  undoRows: vi.fn(),
  saveRows: vi.fn(),
  undoImport: vi.fn(),
  viewImported: vi.fn(),
  viewBatch: vi.fn(),
};
vi.mock('../useImportActions', () => ({ useImportActions: () => actions }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: () => ({ accounts: [{ id: 'a1', name: 'FTMO 100K', currency: 'USD', status: 'active' }, { id: 'a2', name: 'Zerodha F&O', currency: 'INR', status: 'active' }], selectedAccountId: null }),
}));
let writableAccountIds: string[] | null = null;
let readOnly = false;
vi.mock('@/hooks/useEntitlements', () => ({ useEntitlements: () => ({ usage: [], readOnly, writableAccountIds, periodResetsAt: undefined }) }));
vi.mock('@/store/api/importApi', () => ({
  useGetImportBatchesQuery: () => ({ data: undefined, isFetching: false, isError: false, refetch: vi.fn() }),
  useGetImportSourcesQuery: () => ({
    data: [
      { id: 'zerodha', name: 'Zerodha (Console tradebook)', assetClasses: [], fileTypes: ['csv'], howToExport: 'Console → Reports → Tradebook.', sampleColumns: ['symbol', 'trade_date'] },
      { id: 'generic_csv', name: 'Other broker (CSV / Excel)', assetClasses: [], fileTypes: ['csv'], howToExport: 'Use the template.', sampleColumns: ['Symbol', 'Side'] },
    ],
  }),
}));

const trade = (p: Partial<NormalizedTrade> = {}): NormalizedTrade => ({
  symbol: 'NIFTY', side: 'BUY', quantity: 10, entryPrice: 100, exitPrice: 105, openDate: '2026-10-02T03:45:00.000Z', closeDate: '2026-10-02T06:10:00.000Z',
  outcome: 'TP', pnl: 48.5, stopLoss: null, takeProfit: null, tags: [], assetClass: 'stock', fees: 1.5, grossPnl: 50, externalId: 'a', importSource: 'generic_csv', ...p,
});

const renderCenter = () => render(<MemoryRouter><ImportCenter /></MemoryRouter>);
const seed = (patch = {}) =>
  act(() =>
    importFlow.set({
      phase: 'review',
      accountId: 'a1',
      fileLabel: 'tradebook-oct.csv',
      detected: 'zerodha',
      rows: makeRows([trade({ externalId: '1' }), trade({ externalId: '2', exitPrice: 0 }), trade({ externalId: '3', duplicate: true }), trade({ externalId: '4' })], 'tradebook-oct.csv'),
      ...patch,
    }),
  );

beforeEach(() => {
  writableAccountIds = null;
  readOnly = false;
  Object.values(actions).forEach((f) => f.mockReset());
  act(() => importFlow.reset());
  act(() => importFlow.set({ accountId: null }));
});

describe('ImportCenter before a file', () => {
  it('shows the account, the source, one drop zone, the export guide and the sync sentence', async () => {
    renderCenter();
    expect(screen.getByText(/Drop a broker export or screenshots here/)).toBeInTheDocument();
    expect(screen.getByText('Automatic broker sync is planned for Pro. It is not available yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zerodha' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Other CSV' }));
    expect(screen.getByText('Use the template.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Download a CSV template/ })).toHaveAttribute('href', '/import-template.csv');
  });

  it('the account is one picker that shows the currency and is chosen with the keyboard', async () => {
    renderCenter();
    const account = screen.getByRole('combobox', { name: /Account/ });
    expect(account).toHaveTextContent('FTMO 100KUSD');
    account.focus();
    await userEvent.keyboard('{Enter}{ArrowDown}{ArrowDown}{Enter}');
    expect(importFlow.get().accountId).toBe('a2');
    expect(account).toHaveTextContent('Zerodha F&OINR');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('lists an account the plan made read-only with the reason and does not pick it', async () => {
    writableAccountIds = ['a1'];
    renderCenter();
    await userEvent.click(screen.getByRole('combobox', { name: /Account/ }));
    const locked = screen.getByRole('option', { name: /Zerodha F&O/ });
    expect(locked).toHaveAttribute('aria-disabled', 'true');
    expect(locked).toHaveTextContent('Read-only');
    await userEvent.click(locked);
    expect(importFlow.get().accountId).toBe('a1');
  });

  it('moves the default off an account that turns out read-only when the plan loads after the accounts', () => {
    const view = renderCenter();
    expect(importFlow.get().accountId).toBe('a1');
    writableAccountIds = ['a2'];
    view.rerender(<MemoryRouter><ImportCenter /></MemoryRouter>);
    expect(importFlow.get().accountId).toBe('a2');
    expect(screen.getByRole('combobox', { name: /Account/ })).toHaveTextContent('Zerodha F&OINR');
  });

  it('hands dropped files to the import and defaults the account to the first writable one', () => {
    renderCenter();
    expect(importFlow.get().accountId).toBe('a1');
    const file = new File(['x'], 'tradebook.csv', { type: 'text/csv' });
    fireEvent.drop(screen.getByText(/Drop a broker export/).closest('div')!, { dataTransfer: { files: [file] } });
    expect(actions.addFiles).toHaveBeenCalledWith([file]);
  });

  it('shows a parse in progress with Cancel', async () => {
    act(() => importFlow.set({ phase: 'parsing', progress: { label: 'Reading screenshot 4 of 7', done: 3, total: 7 } }));
    renderCenter();
    expect(screen.getByRole('status')).toHaveTextContent('Reading screenshot 4 of 7…');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(actions.cancelParse).toHaveBeenCalled();
  });

  it('shows an error with Retry when a kept file can be parsed again', async () => {
    act(() => importFlow.set({ error: 'The request was not valid.', rawFile: { name: 'f.csv', contentBase64: 'eA==' } }));
    renderCenter();
    expect(screen.getByRole('alert')).toHaveTextContent('The request was not valid.');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(actions.reparse).toHaveBeenCalled();
  });
});

describe('ImportCenter review', () => {
  it('summarises the file, counts statuses in the chips and blocks Import while a checked row needs a fix', async () => {
    seed();
    renderCenter();
    expect(screen.getByText('tradebook-oct.csv')).toBeInTheDocument();
    expect(screen.getByText(/4 rows parsed/)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Needs a fix, 1 row' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Already imported, 1 row' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import 2 trades' })).toBeDisabled();
    expect(screen.getByText('Fix or exclude 1 row')).toBeInTheDocument();
    expect(screen.getByText('1 need a fix')).toBeInTheDocument();
  });

  it('Import counts only ready rows and saves when nothing needs a fix; Ctrl+Enter does the same', async () => {
    seed({ rows: makeRows([trade({ externalId: '1' }), trade({ externalId: '3', duplicate: true }), trade({ externalId: '4' })], 'f.csv') });
    renderCenter();
    await userEvent.click(screen.getByRole('button', { name: 'Import 2 trades' }));
    expect(actions.saveRows).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByRole('grid'), { key: 'Enter', ctrlKey: true });
    expect(actions.saveRows).toHaveBeenCalledTimes(2);
  });

  it('filters the grid by a status chip', async () => {
    seed();
    renderCenter();
    await userEvent.click(screen.getByRole('radio', { name: 'Already imported, 1 row' }));
    expect(importFlow.get().filter).toBe('duplicate');
  });

  it('Discard asks first and names the number of reviewed trades', async () => {
    seed();
    renderCenter();
    await userEvent.click(screen.getByRole('button', { name: 'Discard' }));
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText('Discard this import?')).toBeInTheDocument();
    expect(within(dialog).getByText(/4 reviewed trades will be removed/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Discard import' }));
    expect(importFlow.get().phase).toBe('idle');
    expect(importFlow.get().rows).toHaveLength(0);
  });

  it('selected rows offer Exclude, Include, Merge (only for one symbol and direction) and Clear', async () => {
    seed({ rows: makeRows([trade({ externalId: '1' }), trade({ externalId: '2' }), trade({ externalId: '3', symbol: 'BANKNIFTY' })], 'f.csv') });
    renderCenter();
    await userEvent.click(screen.getByRole('button', { name: 'Select row 1 for Exclude, Include or Merge' }));
    await userEvent.click(screen.getByRole('button', { name: 'Select row 3 for Exclude, Include or Merge' }));
    expect(screen.getByText('2 rows selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Merge' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Select row 3 for Exclude, Include or Merge' }));
    await userEvent.click(screen.getByRole('button', { name: 'Select row 2 for Exclude, Include or Merge' }));
    await userEvent.click(screen.getByRole('button', { name: 'Merge' }));
    expect(actions.merge).toHaveBeenCalledWith([expect.any(String), expect.any(String)]);
  });

  it('a generic CSV without a known layout shows the column mapping instead of a grid', () => {
    seed({ rows: [], columns: { headers: ['Scrip', 'B/S'], suggested: { symbol: 'Scrip' } } });
    renderCenter();
    expect(screen.getByRole('heading', { name: 'Match the columns in your file' })).toBeInTheDocument();
    expect(screen.queryByRole('grid')).toBeNull();
  });

  it('says why a file gave no trades and what to do next', () => {
    seed({ rows: [], warnings: ['No trade rows found.'] });
    renderCenter();
    expect(screen.getAllByText(/No trade rows found\./).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /^Import \d+/ })).toBeNull();
  });

  it('warns when the file was cut at the review ceiling', () => {
    seed({ warnings: ['The file has 7412 trades; only the first 5000 are returned. Import a shorter date range for the rest.'] });
    renderCenter();
    expect(screen.getByText(/This file has 7,412 trades\. The first 5,000 are shown\. Split the file by date/)).toBeInTheDocument();
  });

  it('shows the save progress in place of the button', () => {
    seed({ phase: 'saving', progress: { label: 'Saving 100 of 131', done: 100, total: 131 } });
    renderCenter();
    expect(screen.getByText('Saving 100 of 131')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Importing…' })).toBeDisabled();
  });
});

describe('ImportCenter result', () => {
  it('replaces the footer with the result row and its actions', async () => {
    seed({ phase: 'done', result: { created: 3, skipped: 0, errors: 0, failed: 0, batchId: 'b', createdIds: ['t1', 't2', 't3'], failedExternalIds: [] } });
    renderCenter();
    expect(screen.getByText(/3 trades imported into FTMO 100K · 0 failed/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'View imported trades' }));
    expect(actions.viewImported).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Undo import' }));
    expect(actions.undoImport).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Import another' }));
    expect(importFlow.get().phase).toBe('idle');
  });

  it('after a partial failure offers a retry of exactly the failed rows', async () => {
    seed({ result: { created: 2, skipped: 0, errors: 0, failed: 2, batchId: 'b', createdIds: ['t1', 't2'], failedExternalIds: ['1', '4'] } });
    renderCenter();
    await userEvent.click(screen.getByRole('button', { name: 'Retry 2 failed' }));
    expect(actions.saveRows).toHaveBeenCalledWith({ retry: true });
  });
});

describe('Import flow store', () => {
  it('keeps reviewed rows when the page unmounts and reports them as pending', () => {
    seed();
    const { unmount } = renderCenter();
    unmount();
    expect(importFlow.hasPending()).toBe(true);
    expect(importFlow.hasUnsavedReview()).toBe(true);
    renderCenter();
    expect(screen.getByText('tradebook-oct.csv')).toBeInTheDocument();
  });
});

describe('How to export from', () => {
  it('only opens the steps; the source changes only through the explicit button', async () => {
    renderCenter();
    await userEvent.click(screen.getByRole('button', { name: 'Zerodha' }));
    expect(screen.getByRole('button', { name: 'Zerodha' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Console → Reports → Tradebook.')).toBeInTheDocument();
    expect(importFlow.get().source).toBe('auto');
    await userEvent.click(screen.getByRole('button', { name: 'Use Zerodha as the source' }));
    expect(importFlow.get().source).toBe('zerodha');
    expect(screen.getByText(/This is the source for your next file/)).toBeInTheDocument();
  });
});

describe('A file that gives no rows', () => {
  const file = { name: 'f.csv', contentBase64: 'eA==' };
  it('after a source mismatch offers Detect automatically, Map columns and Choose another file, and draws no empty filter row', async () => {
    seed({ rows: [], source: 'zerodha', rawFile: file, warnings: ['This file does not look like a Zerodha (Console tradebook) export. Check the source or let the app detect it.'] });
    renderCenter();
    expect(screen.getByRole('alert')).toHaveTextContent('This file could not be read as Zerodha');
    expect(screen.getByRole('alert')).toHaveTextContent('Check the source or let the app detect it.');
    expect(screen.queryByRole('radiogroup', { name: 'Show rows' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Detect automatically' }));
    expect(importFlow.get().source).toBe('auto');
    expect(actions.reparse).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Map columns' }));
    expect(importFlow.get().source).toBe('generic_csv');
    expect(actions.reparse).toHaveBeenCalledTimes(2);
  });

  it('with Auto-detect there is no Detect automatically button; Choose another file starts over', async () => {
    seed({ rows: [], source: 'auto', rawFile: file, warnings: ['No trade rows found.'] });
    renderCenter();
    expect(screen.queryByRole('button', { name: 'Detect automatically' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Choose another file' }));
    expect(importFlow.get().phase).toBe('idle');
  });
});

describe('Lines the parser did not read', () => {
  it('lists the lines that could not become rows with line number, text and reason', async () => {
    seed({ unreadLines: [{ line: 7, raw: 'XAUUSD,??,1,2400', reason: 'Side is missing or not readable.' }] });
    renderCenter();
    await userEvent.click(screen.getByRole('button', { name: /1 line not read/ }));
    expect(screen.getByText(/Line 7:/)).toBeInTheDocument();
    expect(screen.getByText('XAUUSD,??,1,2400')).toBeInTheDocument();
    expect(screen.getByText(/Side is missing or not readable\./)).toBeInTheDocument();
  });
});

describe('Past imports', () => {
  it('is offered before a file is added, closed until opened', () => {
    renderCenter();
    expect(screen.getByRole('button', { name: 'Past imports' })).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('Drop-to-import', () => {
  it('reads files queued by another page once the account is chosen, then clears the queue', async () => {
    const file = new File(['x'], 'dropped.csv', { type: 'text/csv' });
    act(() => importFlow.queue([file]));
    render(<MemoryRouter><ImportCenter /></MemoryRouter>);
    await vi.waitFor(() => expect(actions.addFiles).toHaveBeenCalledWith([file], { append: false }));
    expect(importFlow.get().queued).toHaveLength(0);
  });
});

describe('Paste', () => {
  const paste = (target: EventTarget, data: { text?: string; files?: File[] }) => {
    const e = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent;
    Object.defineProperty(e, 'clipboardData', { value: { files: data.files ?? [], getData: (t: string) => (t === 'text/plain' ? data.text ?? '' : '') } });
    act(() => {
      target.dispatchEvent(e);
    });
  };

  it('reads a pasted table of two or more lines as a CSV file', async () => {
    renderCenter();
    paste(document.body, { text: 'Symbol,Side,Quantity\nAUDUSD,Buy,10000\n' });
    await vi.waitFor(() => expect(actions.addFiles).toHaveBeenCalledTimes(1));
    const [[files, opts]] = actions.addFiles.mock.calls as [[File[], { append: boolean }]];
    expect(files[0].name).toBe('pasted.csv');
    expect(await files[0].text()).toBe('Symbol,Side,Quantity\nAUDUSD,Buy,10000');
    expect(opts).toEqual({ append: false });
  });

  it('leaves one line of text, and text pasted into a field, alone', () => {
    renderCenter();
    paste(document.body, { text: 'AUDUSD' });
    const input = document.createElement('input');
    document.body.appendChild(input);
    paste(input, { text: 'a\nb' });
    expect(actions.addFiles).not.toHaveBeenCalled();
    input.remove();
  });

  it('still reads pasted screenshots', async () => {
    renderCenter();
    const shot = new File(['x'], 'shot.png', { type: 'image/png' });
    paste(document.body, { files: [shot] });
    await vi.waitFor(() => expect(actions.addFiles).toHaveBeenCalledWith([shot], { append: false }));
  });
});

describe('Read-only plan', () => {
  it('says the journal is read-only and keeps the drop zone open, so a file reaches the upgrade dialog', () => {
    readOnly = true;
    writableAccountIds = [];
    renderCenter();
    expect(screen.getByRole('status')).toHaveTextContent('Your journal is read-only. Upgrade to Pro to import.');
    expect(screen.getByRole('button', { name: 'Choose files' })).toBeEnabled();
  });
});
