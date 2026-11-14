import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { financialYear, financialYears, formatFyRange } from '../taxYear';

const entitlements = vi.fn();
const capital = vi.fn();
const query = vi.fn();

vi.mock('@/hooks/useEntitlements', () => ({ useEntitlements: () => entitlements() }));
vi.mock('@/components/stats/useScopeCapital', () => ({ useScopeCapital: () => capital() }));
vi.mock('@/components/shell/chrome', () => ({ ScopeBarSlot: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/store/api/statsApi', () => ({ useGetTaxReportQuery: (...a: unknown[]) => query(...a) }));

import { TaxReport } from '../TaxReport';

const bucket = (trades: number, net: number, fees = 10) => ({ trades, wins: Math.ceil(trades / 2), losses: Math.floor(trades / 2), grossPnl: net + fees, fees, netPnl: net });
const report = {
  fy: '2026-27',
  period: { from: '2026-04-01', to: '2027-03-31' },
  accountId: null,
  intradayEquity: bucket(10, 1000),
  fno: { ...bucket(4, -500), turnover: 2500000, auditThreshold: 100000000, auditThresholdExceeded: false },
  commodity: bucket(0, 0, 0),
  delivery: { shortTerm: bucket(2, 300), longTerm: bucket(0, 0, 0) },
  notCovered: { trades: 3, netPnl: 40 },
  charges: { total: 160, stt: 40, exchange: 30, sebi: 1, stamp: 9, brokerageGstAndOther: 80 },
  warnings: ['Estimates from your journal: confirm figures with your chartered accountant.'],
};
const zerodha = { id: 'z', currency: 'INR' };
const ftmo = { id: 'f', currency: 'USD' };

beforeEach(() => {
  entitlements.mockReset().mockReturnValue({ isLoading: false, isError: false, can: () => true, currency: 'INR' });
  capital.mockReset().mockReturnValue({ accounts: [zerodha], selectedAccountId: 'z' });
  query.mockReset().mockReturnValue({ data: report, isLoading: false, isError: false, refetch: vi.fn() });
});

describe('TaxReport', () => {
  it('shows profit and charges by category in rupees with a total', () => {
    renderWithProviders(<TaxReport />);
    const table = screen.getByRole('table', { name: /financial year 2026-27/i });
    expect(within(table).getByText('Intraday equity')).toBeInTheDocument();
    expect(within(table).getByText('Futures and options')).toBeInTheDocument();
    expect(within(table).queryByText('Commodity derivatives')).not.toBeInTheDocument();
    const total = within(table).getByRole('row', { name: /Total/ });
    expect(within(total).getByText('+₹800.00')).toBeInTheDocument();
    expect(screen.getByText('01 Apr 2026 – 31 Mar 2027')).toBeInTheDocument();
  });

  it('the table scrolls inside a named, focusable region, so a phone keyboard can scroll it (it has no links)', () => {
    renderWithProviders(<TaxReport />);
    const region = screen.getByRole('region', { name: 'Financial year 2026-27 by category' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(within(region).getByRole('table')).toBeInTheDocument();
  });

  it('states the F&O turnover against the audit threshold, the charges, the uncovered trades and the caveat', () => {
    renderWithProviders(<TaxReport />);
    expect(screen.getByText(/the threshold is not exceeded/)).toBeInTheDocument();
    expect(screen.getByText('Securities transaction tax')).toBeInTheDocument();
    expect(screen.getByText(/3 forex, crypto or CFD trades are not covered/)).toBeInTheDocument();
    expect(screen.getByText(/confirm figures with your chartered accountant/)).toBeInTheDocument();
  });

  it('asks the server for the selected account and the financial year in the URL', () => {
    renderWithProviders(<TaxReport />, { route: '/app/analytics?tab=tax&fy=2025-26' });
    expect(query).toHaveBeenCalledWith({ fy: '2025-26', accountId: 'z' }, { skip: false });
    expect(screen.getByRole('combobox', { name: 'Financial year' })).toHaveTextContent('2025-26');
  });

  it('locks the report on Free without requesting it', () => {
    entitlements.mockReturnValue({ isLoading: false, isError: false, can: () => false, currency: 'INR' });
    renderWithProviders(<TaxReport />);
    expect(screen.getByTestId('locked-preview')).toHaveTextContent('Tax report');
    expect(query).toHaveBeenCalledWith(expect.anything(), { skip: true });
  });

  it('needs rupee accounts and says so instead of adding currencies', () => {
    capital.mockReturnValue({ accounts: [zerodha, ftmo], selectedAccountId: null });
    renderWithProviders(<TaxReport />);
    expect(screen.getByText('The tax report is in rupees.')).toBeInTheDocument();
    expect(query).toHaveBeenCalledWith(expect.anything(), { skip: true });
  });

  it('shows the API message of a failed load, and the connection message only without a response', () => {
    query.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: { status: 422, data: { message: 'The financial year is not valid.' } }, refetch: vi.fn() });
    const { unmount } = renderWithProviders(<TaxReport />);
    expect(screen.getByRole('alert')).toHaveTextContent('The financial year is not valid.');
    expect(screen.getByRole('alert')).not.toHaveTextContent(/internet connection/i);
    unmount();
    query.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: { status: 'FETCH_ERROR' }, refetch: vi.fn() });
    renderWithProviders(<TaxReport />);
    expect(screen.getByRole('alert')).toHaveTextContent(/Check your internet connection/);
  });

  it('shows an error with Retry and a skeleton while loading', async () => {
    const refetch = vi.fn();
    query.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch });
    const { unmount } = renderWithProviders(<TaxReport />);
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalled();
    unmount();
    query.mockReturnValue({ data: undefined, isLoading: true, isError: false, refetch });
    renderWithProviders(<TaxReport />);
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('says there are no closed trades in an empty year', () => {
    query.mockReturnValue({ data: { ...report, intradayEquity: bucket(0, 0, 0), fno: { ...report.fno, ...bucket(0, 0, 0) }, delivery: { shortTerm: bucket(0, 0, 0), longTerm: bucket(0, 0, 0) } }, isLoading: false, isError: false, refetch: vi.fn() });
    renderWithProviders(<TaxReport />);
    expect(screen.getByText('No closed trades in this financial year.')).toBeInTheDocument();
  });
});

describe('financial year helpers', () => {
  it('starts the year in April', () => {
    expect(financialYear(new Date(2026, 3, 1))).toBe('2026-27');
    expect(financialYear(new Date(2026, 2, 31))).toBe('2025-26');
    expect(financialYear(new Date(2026, 10, 12))).toBe('2026-27');
  });

  it('lists the current and the three previous years, newest first, across the century', () => {
    expect(financialYears(new Date(2026, 10, 12))).toEqual(['2026-27', '2025-26', '2024-25', '2023-24']);
    expect(financialYears(new Date(2000, 5, 1), 2)).toEqual(['2000-01', '1999-00']);
  });

  it('writes the range with day, short month and year', () => {
    expect(formatFyRange('2026-04-01', '2027-03-31')).toBe('01 Apr 2026 – 31 Mar 2027');
  });
});
