import { describe, it, expect, afterEach } from 'vitest';
import { waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { NseLotSizePage } from '../resources/NseLotSizePage';
import { INDEX_LOT_CIRCULARS, STOCK_LOT_CIRCULARS } from '@/content/nse-lot-circulars';

/** Invented underlyings in the layout of NSE's file; the page ships no NSE table, so the tests do not either. */
const FILE = [
  'UNDERLYING                          ,SYMBOL    ,AAA-26     ,BBB-26     ,CCC-27     ',
  'ALPHA INDEX                         ,ALPHAIDX  ,10         ,10         ,10         ',
  'Derivatives on Individual Securities,Symbol    ,AAA-26     ,BBB-26     ,           ',
  'GAMMA CEMENTS LIMITED               ,GAMMACEM  ,100        ,150        ,           ',
  'DELTA & CO LTD                      ,DELTACO   ,50         ,50         ,           ',
].join('\n');

const lotFile = (text = FILE) => new File([text], 'fo_mktlots.csv', { type: 'text/csv' });

afterEach(() => {
  document.title = '';
  document.head.querySelectorAll('meta, link[rel="canonical"], script[type="application/ld+json"]').forEach((el) => el.remove());
});

describe('NseLotSizePage', () => {
  it('renders the heading, the source line and the check-before-trading warning without copying NSE\'s table', () => {
    renderWithProviders(<NseLotSizePage />);
    expect(screen.getByRole('heading', { level: 1, name: /NSE F&O lot sizes by expiry month/ })).toBeInTheDocument();
    expect(screen.getAllByText(/Check the NSE file before trading; lot sizes change\./).length).toBeGreaterThan(1);
    expect(screen.getByRole('link', { name: /NSE's lot file, fo_mktlots\.csv/ })).toHaveAttribute('href', 'https://nsearchives.nseindia.com/content/fo/fo_mktlots.csv');
    expect(screen.getByRole('link', { name: 'Terms of Use' })).toHaveAttribute('href', 'https://www.nseindia.com/static/nse-terms-of-use');
    expect(screen.queryByRole('region', { name: 'Lot sizes by expiry month' })).not.toBeInTheDocument();
  });

  it('keeps the title at 60 characters or fewer and the description at 160 or fewer', async () => {
    renderWithProviders(<NseLotSizePage />);
    await waitFor(() => expect(document.title).toMatch(/TradeQut$/));
    expect(document.title.length).toBeLessThanOrEqual(60);
    expect(document.querySelector('meta[name="description"]')!.getAttribute('content')!.length).toBeLessThanOrEqual(160);
  });

  it('shows each index circular with its link and the old and new lot', () => {
    renderWithProviders(<NseLotSizePage />);
    const table = screen.getByRole('table', { name: /Index lot sizes before and after each NSE revision circular/ });
    for (const c of INDEX_LOT_CIRCULARS) {
      expect(within(table).getByRole('link', { name: c.ref })).toHaveAttribute('href', c.url);
    }
    const latest = within(table).getByRole('link', { name: 'NSE/FAOP/70616' }).closest('tr')!;
    expect(within(latest).getByText('75 → 65')).toBeInTheDocument();
    expect(within(latest).getByText('35 → 30')).toBeInTheDocument();
    for (const c of STOCK_LOT_CIRCULARS) expect(screen.getByRole('link', { name: c.ref })).toHaveAttribute('href', c.url);
  });

  it('renders the FAQ visibly and in the structured data', async () => {
    renderWithProviders(<NseLotSizePage />);
    expect(screen.getByRole('heading', { level: 3, name: 'Why do lot sizes keep changing?' })).toBeInTheDocument();
    await waitFor(() => expect(document.querySelector('script[type="application/ld+json"]')).not.toBeNull());
    expect(document.querySelector('script[type="application/ld+json"]')!.textContent).toContain('FAQPage');
  });

  it('loads a file from the device, flags lots that change, switches tabs and filters by search', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NseLotSizePage />);
    await user.upload(screen.getByLabelText(/Choose the saved file/), lotFile());

    const region = await screen.findByRole('region', { name: 'Lot sizes by expiry month' });
    expect(within(region).getByText('ALPHAIDX')).toBeInTheDocument();
    expect(within(region).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Underlying', 'AAA-26', 'BBB-26', 'CCC-27']);
    expect(screen.getByText(/loaded from your device on/)).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Stocks (2)' }));
    const stocks = screen.getByRole('region', { name: 'Lot sizes by expiry month' });
    expect(within(stocks).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Underlying', 'AAA-26', 'BBB-26']);
    const gamma = within(stocks).getByText('GAMMACEM').closest('tr')!;
    expect(within(gamma).getByText('Changes later')).toBeInTheDocument();
    expect(within(within(stocks).getByText('DELTACO').closest('tr')!).queryByText('Changes later')).not.toBeInTheDocument();

    await user.type(screen.getByRole('searchbox', { name: 'Search by name or symbol' }), 'cements');
    expect(within(screen.getByRole('region', { name: 'Lot sizes by expiry month' })).queryByText('DELTACO')).not.toBeInTheDocument();
    expect(screen.getByText('1 of 2 stocks')).toBeInTheDocument();

    await user.clear(screen.getByRole('searchbox', { name: 'Search by name or symbol' }));
    await user.type(screen.getByRole('searchbox', { name: 'Search by name or symbol' }), 'nomatch');
    expect(screen.getByText(/No underlying matches/)).toBeInTheDocument();
  });

  it('says so when the chosen file is not the NSE lot file', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NseLotSizePage />);
    await user.upload(screen.getByLabelText(/Choose the saved file/), lotFile('date,symbol,qty\n2026-11-15,ABC,10'));
    expect(await screen.findByRole('alert')).toHaveTextContent(/does not look like the NSE F&O lot file/);
    expect(screen.queryByRole('region', { name: 'Lot sizes by expiry month' })).not.toBeInTheDocument();
  });

  it('computes contract value from the lot size and price you type', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NseLotSizePage />);
    expect(screen.getByText(/Type a lot size from the table above/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Lot size (units per lot)'), '65');
    await user.type(screen.getByLabelText(/Price per unit/), '25000');
    expect(screen.getByText('₹16,25,000')).toBeInTheDocument();
  });
});
