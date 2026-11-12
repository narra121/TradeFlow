import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { DataPrivacySection } from '../DataPrivacySection';
import { emailMatches } from '../helpers';
import { exportFileName, formatFileSize } from '../useDataExport';

const useProfile = vi.fn();
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => useProfile() }));

const exportMyData = vi.fn();
const deleteAccount = vi.fn();
vi.mock('@/store/api/profileApi', () => ({
  useExportMyDataMutation: () => [exportMyData, { isLoading: false }],
  useDeleteAccountMutation: () => [deleteAccount, { isLoading: false }],
}));
const clearLocal = vi.fn();
vi.mock('@/store/api/authApi', () => ({ useLogoutMutation: () => [clearLocal, { isLoading: false }] }));
const openConsentSettings = vi.fn();
vi.mock('@/lib/analytics/consent', () => ({ openConsentSettings: () => openConsentSettings() }));

const ok = (v?: unknown) => ({ unwrap: () => Promise.resolve(v), abort: vi.fn() });
const fail = () => ({ unwrap: () => Promise.reject({ status: 500 }), abort: vi.fn() });
const base = { email: 'Ada@Example.com', method: 'password', isLoading: false, isError: false, refetch: vi.fn() };
const renderIt = () => render(<MemoryRouter><DataPrivacySection /></MemoryRouter>);

describe('DataPrivacySection', () => {
  const assign = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    useProfile.mockReturnValue(base);
    clearLocal.mockReturnValue(ok());
    URL.createObjectURL = vi.fn(() => 'blob:export');
    URL.revokeObjectURL = vi.fn();
    Object.defineProperty(window, 'location', { value: { assign }, writable: true });
  });

  it('exports: shows a download link with the size and a dated file name', async () => {
    exportMyData.mockReturnValue(ok({ exportVersion: 1, exportedAt: '2026-11-11T10:00:00Z', trades: [] }));
    const user = userEvent.setup();
    renderIt();
    await user.click(screen.getByRole('button', { name: 'Export my data' }));
    const link = await screen.findByRole('link', { name: /Download export \(/ });
    expect(link).toHaveAttribute('download', 'tradequt-export-2026-11-11.json');
    expect(link).toHaveAttribute('href', 'blob:export');
  });

  it('can cancel a running export', async () => {
    const abort = vi.fn();
    exportMyData.mockReturnValue({ unwrap: () => new Promise(() => undefined), abort });
    const user = userEvent.setup();
    renderIt();
    await user.click(screen.getByRole('button', { name: 'Export my data' }));
    expect(screen.getByText('Preparing your export…')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(abort).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Export my data' })).toBeInTheDocument();
  });

  it('shows a failed export inline with a Retry that works', async () => {
    exportMyData.mockReturnValueOnce(fail()).mockReturnValueOnce(ok({ exportVersion: 1, exportedAt: '2026-11-11T00:00:00Z' }));
    const user = userEvent.setup();
    renderIt();
    await user.click(screen.getByRole('button', { name: 'Export my data' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't prepare your export");
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('link', { name: /Download export/ })).toBeInTheDocument();
  });

  it('states what AI receives and opens cookie settings', async () => {
    const user = userEvent.setup();
    renderIt();
    expect(screen.getByText(/never notes, screenshots, names or email/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', '/privacy');
    await user.click(screen.getByRole('button', { name: 'Cookie settings' }));
    expect(openConsentSettings).toHaveBeenCalled();
  });

  it('delete needs the typed email in any case, defaults focus to Cancel, ignores Enter, then goes to /goodbye', async () => {
    deleteAccount.mockReturnValue(ok());
    const user = userEvent.setup();
    renderIt();
    await user.click(screen.getByRole('button', { name: 'Delete account…' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Delete your TradeQut account?')).toBeInTheDocument();
    expect(within(dialog).getByText(/35 days/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();
    const confirm = within(dialog).getByRole('button', { name: 'Delete account' });
    expect(confirm).toBeDisabled();
    await user.type(within(dialog).getByLabelText('Type Ada@Example.com to confirm'), 'ada@example.COM{Enter}');
    expect(deleteAccount).not.toHaveBeenCalled();
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/goodbye'));
    expect(clearLocal).toHaveBeenCalled();
  });

  it('delete failure keeps the user signed in with an inline error', async () => {
    deleteAccount.mockReturnValue(fail());
    const user = userEvent.setup();
    renderIt();
    await user.click(screen.getByRole('button', { name: 'Delete account…' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.type(within(dialog).getByLabelText(/Type .* to confirm/), 'ada@example.com');
    await user.click(within(dialog).getByRole('button', { name: 'Delete account' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Nothing was removed');
    expect(assign).not.toHaveBeenCalled();
    expect(clearLocal).not.toHaveBeenCalled();
  });

  it('offers the export from inside the delete dialog', async () => {
    exportMyData.mockReturnValue(ok({ exportVersion: 1, exportedAt: '2026-11-11T00:00:00Z' }));
    const user = userEvent.setup();
    renderIt();
    await user.click(screen.getByRole('button', { name: 'Delete account…' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Export my data first' }));
    expect(await within(dialog).findByRole('link', { name: /Download export/ })).toBeInTheDocument();
  });

  it('shows an error state when the profile fails to load', () => {
    useProfile.mockReturnValue({ ...base, isError: true });
    renderIt();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});

describe('helpers', () => {
  it('emailMatches ignores case and surrounding spaces and never matches an empty email', () => {
    expect(emailMatches(' ADA@x.io ', 'ada@x.io')).toBe(true);
    expect(emailMatches('', '')).toBe(false);
    expect(emailMatches('ada@x.i', 'ada@x.io')).toBe(false);
  });

  it('formats sizes and file names', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(2048)).toBe('2.0 KB');
    expect(formatFileSize(2.1 * 1024 * 1024)).toBe('2.1 MB');
    expect(exportFileName('2026-11-11T10:00:00Z')).toBe('tradequt-export-2026-11-11.json');
    expect(exportFileName(undefined, new Date('2026-01-02T00:00:00Z'))).toBe('tradequt-export-2026-01-02.json');
  });
});
