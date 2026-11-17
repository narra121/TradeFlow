import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Trade } from '@/types/trade';

let profile: { name: string; email: string; preferences?: Record<string, unknown> } | undefined;
let profileLoading = false;
const updatePrefs = vi.fn();
const updateNotifs = vi.fn();
let saved: Record<string, string[]> | undefined;
let savedError = false;
let savedFailure: unknown;
const writeOptions = vi.fn();
let trades: Partial<Trade>[] = [];
let plan: 'free' | 'pro' = 'pro';

vi.mock('@/store/api/userApi', () => ({
  useGetProfileQuery: () => ({ data: profile, isLoading: profileLoading, isError: false }),
  useUpdatePreferencesMutation: () => [(a: unknown) => ({ unwrap: () => updatePrefs(a) }), { isLoading: false }],
  useUpdateNotificationsMutation: () => [(a: unknown) => ({ unwrap: () => updateNotifs(a) }), { isLoading: false }],
}));
vi.mock('@/store/api/savedOptionsApi', () => ({
  useGetSavedOptionsQuery: () => ({ data: saved, isLoading: false, isError: savedError, error: savedFailure, refetch: vi.fn() }),
  useUpdateSavedOptionsMutation: () => [(a: unknown) => ({ unwrap: () => writeOptions(a) }), { isLoading: false }],
}));
vi.mock('@/hooks/useScopeTrades', () => ({ useScopeTrades: () => ({ trades, isLoading: false, truncated: false }) }));
vi.mock('@/hooks/useEntitlements', () => ({ useEntitlements: () => ({ isPro: plan === 'pro', isLoading: false, plan, readOnly: plan === 'free' }) }));

import { OptionList } from '../OptionList';
import { OptionsSection } from '../OptionsSection';
import { PreferencesSection } from '../PreferencesSection';
import { NotificationsSection } from '../NotificationsSection';
import { MAIN_LISTS, MORE_LISTS, countUsage, hasValue, isStarterList, ownEntries } from '../optionLists';
import { browserZone } from '../timeZones';
import { deviceFromServer, needsTimeZone, periodToServer, useSyncServerPreferences } from '../usePreferences';
import { resetUiStateCache, patchUiState } from '@/hooks/useUiState';
import { renderWithProviders } from '@/test/test-utils';
import type { DatePreset } from '@/lib/scope';

const strategies = MAIN_LISTS.find((l) => l.key === 'strategies')!;

beforeEach(() => {
  localStorage.clear();
  resetUiStateCache();
  profile = { name: 'Ann', email: 'ann@example.com', preferences: { carryForwardGoalsRules: true, notifications: { weeklyReport: true } } };
  profileLoading = false;
  saved = { strategies: ['Breakout', 'Pullback'], sessions: [], marketConditions: [], mistakes: [], newsEvents: [], tags: [], symbols: [], timeframes: [] };
  savedError = false;
  savedFailure = undefined;
  trades = [];
  plan = 'pro';
  [updatePrefs, updateNotifs, writeOptions].forEach((m) => m.mockReset());
  updatePrefs.mockResolvedValue({});
  updateNotifs.mockResolvedValue({});
  writeOptions.mockResolvedValue({});
});

describe('option list helpers', () => {
  it('counts the trades that carry each value', () => {
    const t = [{ strategy: 'Breakout', mistakes: ['FOMO', 'Overtrading'] }, { strategy: 'Breakout', mistakes: ['FOMO'] }, { strategy: 'Pullback' }] as Trade[];
    const s = countUsage(strategies, t)!;
    expect(s.get('Breakout')).toBe(2);
    expect(s.get('Pullback')).toBe(1);
    expect(countUsage(MAIN_LISTS.find((l) => l.key === 'mistakes')!, t)!.get('FOMO')).toBe(2);
    expect(countUsage(MORE_LISTS.find((l) => l.key === 'timeframes')!, [{ images: [{ timeframe: '15m' }] }] as unknown as Trade[])!.get('15m')).toBe(1);
  });
  it('matches values case-insensitively and tells own entries from the starter list', () => {
    expect(hasValue(['Breakout'], ' breakout ')).toBe(true);
    expect(ownEntries(strategies, [...strategies.defaults, 'My setup'])).toEqual(['My setup']);
    expect(isStarterList(strategies, [...strategies.defaults])).toBe(true);
    expect(isStarterList(strategies, ['Breakout'])).toBe(false);
  });
});

describe('OptionList', () => {
  const setup = (over: Partial<React.ComponentProps<typeof OptionList>> = {}) => {
    const props = { def: strategies, values: ['Breakout', 'Pullback'], usage: new Map([['Breakout', 14], ['Pullback', 0]]), saving: false, onAdd: vi.fn().mockResolvedValue(undefined), onRemove: vi.fn().mockResolvedValue(undefined), onReset: vi.fn().mockResolvedValue(undefined), ...over };
    render(<OptionList {...props} />);
    return props;
  };

  it('shows each value with its usage count and a named remove button', () => {
    setup();
    expect(screen.getByText('Breakout')).toBeInTheDocument();
    expect(screen.getByText('· 14')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Breakout' })).toBeInTheDocument();
  });

  it('adds with Enter and clears the field', async () => {
    const p = setup();
    await userEvent.type(screen.getByLabelText('Add a strategy'), 'Range fade{Enter}');
    expect(p.onAdd).toHaveBeenCalledWith('Range fade');
    expect(screen.getByLabelText('Add a strategy')).toHaveValue('');
  });

  it('says a duplicate is already in the list and does not add it', async () => {
    const p = setup();
    await userEvent.type(screen.getByLabelText('Add a strategy'), 'breakout{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent('"breakout" is already in the list');
    expect(p.onAdd).not.toHaveBeenCalled();
  });

  it('remove confirms with the usage sentence, Cancel is the default focus, then removes', async () => {
    const p = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Remove Breakout' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Remove "Breakout" from the list?');
    expect(dialog).toHaveTextContent('14 trades keep it; it only leaves the pick list.');
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove' }));
    expect(p.onRemove).toHaveBeenCalledWith('Breakout');
  });

  it('reset names the list and the number of own entries, and is off on the starter list', async () => {
    const p = setup({ values: [...strategies.defaults, 'My setup'] });
    await userEvent.click(screen.getByRole('button', { name: 'Reset to defaults' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Reset Strategies to the starter list?');
    expect(dialog).toHaveTextContent('Your 1 own entry is removed from the pick list. Trades keep their values.');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reset Strategies' }));
    expect(p.onReset).toHaveBeenCalled();
  });

  it('the reset button is disabled when the list already is the starter list', () => {
    setup({ values: [...strategies.defaults] });
    expect(screen.getByRole('button', { name: 'Reset to defaults' })).toBeDisabled();
  });

  it('a failed save is an inline alert', async () => {
    setup({ onAdd: vi.fn().mockRejectedValue({ status: 400, data: { message: 'A list can hold at most 50 entries.' } }) });
    await userEvent.type(screen.getByLabelText('Add a strategy'), 'Range fade{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn\'t add "Range fade". A list can hold at most 50 entries.');
  });

  it('a failure with no HTTP response shows the connection message, and a body-less one says Try again', async () => {
    setup({ onAdd: vi.fn().mockRejectedValueOnce({ status: 'FETCH_ERROR', error: 'TypeError: Failed to fetch' }).mockRejectedValueOnce({ status: 500 }) });
    await userEvent.type(screen.getByLabelText('Add a strategy'), 'Range fade{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent(/Couldn't add "Range fade"\. .*internet connection/i);
    await userEvent.type(screen.getByLabelText('Add a strategy'), 'Fade two{Enter}');
    await vi.waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Couldn\'t add "Fade two". Try again.'));
  });
});

describe('OptionsSection', () => {
  it('lists the six main lists with counts from the loaded trades, and More lists collapsed', () => {
    trades = [{ strategy: 'Breakout' }, { strategy: 'Breakout' }];
    render(<OptionsSection />);
    for (const t of ['Strategies', 'Sessions', 'Market conditions', 'Mistakes', 'News events', 'Tags']) expect(screen.getByRole('heading', { name: t })).toBeInTheDocument();
    expect(screen.getByText('· 2')).toBeInTheDocument();
    expect(screen.getByText('Counts are for the 2 trades loaded.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Symbols' })).toBeNull();
  });

  it('writes the whole option set with only the changed list different', async () => {
    render(<OptionsSection />);
    await userEvent.type(screen.getAllByLabelText('Add a strategy')[0], 'Range fade{Enter}');
    await vi.waitFor(() => expect(writeOptions).toHaveBeenCalled());
    expect(writeOptions.mock.calls[0][0]).toMatchObject({ strategies: ['Breakout', 'Pullback', 'Range fade'], sessions: [], tags: [] });
  });

  it('two quick edits are written one after another, the second containing the first', async () => {
    let release!: () => void;
    writeOptions.mockImplementationOnce(() => new Promise<void>((r) => (release = r))).mockResolvedValue({});
    render(<OptionsSection />);
    const field = screen.getAllByLabelText('Add a strategy')[0];
    await userEvent.type(field, 'One{Enter}');
    await userEvent.type(field, 'Two{Enter}');
    expect(writeOptions).toHaveBeenCalledTimes(1);
    await act(async () => release());
    await vi.waitFor(() => expect(writeOptions).toHaveBeenCalledTimes(2));
    expect(writeOptions.mock.calls[1][0].strategies).toEqual(['Breakout', 'Pullback', 'One', 'Two']);
  });

  it('a failed load shows the API message; the connection message only without a response', () => {
    saved = undefined;
    savedError = true;
    savedFailure = { status: 500, data: { message: 'Your options are being restored.' } };
    const { unmount } = render(<OptionsSection />);
    expect(screen.getByRole('alert')).toHaveTextContent('Your options are being restored.');
    expect(screen.getByRole('alert')).not.toHaveTextContent(/internet connection/i);
    unmount();
    savedFailure = { status: 'FETCH_ERROR' };
    render(<OptionsSection />);
    expect(screen.getByRole('alert')).toHaveTextContent(/Check your internet connection/);
  });

  it('a failed load shows an error panel with no edit control (M40)', () => {
    saved = undefined;
    savedError = true;
    render(<OptionsSection />);
    expect(screen.getByRole('alert')).toHaveTextContent("Your trade options didn't load.");
    expect(screen.queryByLabelText('Add a strategy')).toBeNull();
    expect(screen.queryByRole('button', { name: /Add$/ })).toBeNull();
  });
});

describe('server preferences', () => {
  it('maps account values to the device copy and back', () => {
    expect(deviceFromServer({ timeZone: 'Asia/Kolkata', pnlPalette: 'cb', defaultPeriod: '30d' })).toEqual({ timeZone: 'Asia/Kolkata', pnlPalette: 'cb', defaultPeriod: 30 });
    expect(deviceFromServer({ defaultPeriod: 'ytd' })).toEqual({});
    expect(deviceFromServer(undefined)).toEqual({});
    expect(periodToServer('all')).toBe('all');
    expect(periodToServer(30)).toBe('30d');
    expect(periodToServer('thisMonth')).toBeUndefined();
  });
});

describe('PreferencesSection', () => {
  it('P&L colours apply at once, save to the account, and report All changes saved', async () => {
    render(<PreferencesSection />);
    await userEvent.click(screen.getByRole('radio', { name: 'Blue / orange' }));
    expect(updatePrefs).toHaveBeenCalledWith({ pnlPalette: 'cb' });
    expect(await screen.findByText('All changes saved')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Blue / orange' })).toBeChecked();
  });

  it('a refused save puts the control back and says so inline', async () => {
    updatePrefs.mockRejectedValue({ status: 400, data: { message: 'That palette is not available' } });
    render(<PreferencesSection />);
    await userEvent.click(screen.getByRole('radio', { name: 'Blue / orange' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't save. That palette is not available. The value was put back.");
    expect(screen.getByRole('radio', { name: 'Green / red' })).toBeChecked();
  });

  it('a refused save with no message from the API keeps the plain sentence', async () => {
    updatePrefs.mockRejectedValue({ status: 500 });
    render(<PreferencesSection />);
    await userEvent.click(screen.getByRole('radio', { name: 'Blue / orange' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't save. The value was put back.");
  });

  it('density is a device setting and needs no request', async () => {
    render(<PreferencesSection />);
    await userEvent.click(screen.getByRole('radio', { name: 'Compact' }));
    expect(updatePrefs).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('tq.ui') ?? '{}').density).toBe('compact');
  });

  it('carry-forward reverts when the save fails', async () => {
    updatePrefs.mockRejectedValue(new Error('no'));
    render(<PreferencesSection />);
    const sw = screen.getByRole('switch', { name: 'Carry goals and rules into new periods' });
    expect(sw).toBeChecked();
    await userEvent.click(sw);
    await screen.findByRole('alert');
    expect(sw).toBeChecked();
  });

  it('has a time zone control and no week-start control until something reads it', () => {
    patchUiState({ timeZone: 'Asia/Kolkata' });
    render(<PreferencesSection />);
    expect(screen.getByRole('combobox', { name: 'Time zone' })).toBeInTheDocument();
    expect(screen.queryByText(/Week starts on/)).toBeNull();
  });
});

describe('NotificationsSection', () => {
  it('states that account emails are always on and toggles only the weekly report', async () => {
    render(<NotificationsSection />);
    expect(screen.getByText('Always on')).toBeInTheDocument();
    expect(screen.queryByText(/Trade reminders/)).toBeNull();
    await userEvent.click(screen.getByRole('switch', { name: 'Weekly report' }));
    expect(updateNotifs).toHaveBeenCalledWith({ weeklyReport: false });
  });

  it('after the trial (read-only) the switch is off and explains why', () => {
    plan = 'free';
    render(<NotificationsSection />);
    expect(screen.getByRole('switch', { name: 'Weekly report' })).toBeDisabled();
    expect(screen.getByText('The weekly report is part of Pro.')).toBeInTheDocument();
  });

  it('reverts when the save fails', async () => {
    updateNotifs.mockRejectedValue(new Error('no'));
    render(<NotificationsSection />);
    const sw = screen.getByRole('switch', { name: 'Weekly report' });
    await userEvent.click(sw);
    await screen.findByRole('alert');
    expect(sw).toBeChecked();
  });
});

describe('an account without a saved time zone takes the browser zone once (REQUESTS leaf-1.4 #2)', () => {
  const Sync = () => {
    useSyncServerPreferences();
    return null;
  };
  // The canonical IANA name (Asia/Calcutta → Asia/Kolkata), as the time zone list shows it.
  const zone = browserZone();

  it('needsTimeZone: only a loaded profile without timeZone, on a plan that can save', () => {
    const ok = { isLoading: false, readOnly: false, plan: 'trial' };
    expect(needsTimeZone({}, ok)).toBe(true);
    expect(needsTimeZone({ timeZone: 'UTC' }, ok)).toBe(false);
    expect(needsTimeZone({ timeZone: 'Asia/Kolkata' }, ok)).toBe(false);
    expect(needsTimeZone(undefined, ok)).toBe(false);
    expect(needsTimeZone({}, { ...ok, isLoading: true })).toBe(false);
    expect(needsTimeZone({}, { ...ok, plan: null })).toBe(false);
    expect(needsTimeZone({}, { ...ok, plan: 'free', readOnly: true })).toBe(false);
  });

  it('saves the browser zone once through PUT /user/preferences when the profile has none', () => {
    profile = { name: 'Ann', email: 'ann@example.com', preferences: { notifications: { weeklyReport: true } } };
    const { rerender } = renderWithProviders(<Sync />);
    rerender(<Sync />);
    expect(updatePrefs).toHaveBeenCalledTimes(1);
    expect(updatePrefs).toHaveBeenCalledWith({ timeZone: zone });
  });

  it('never overwrites a chosen zone, UTC included', () => {
    profile = { name: 'Ann', email: 'ann@example.com', preferences: { timeZone: 'UTC' } };
    renderWithProviders(<Sync />);
    expect(updatePrefs).not.toHaveBeenCalled();
  });

  it('a read-only plan does not try (the save would be refused with 402 and open the upgrade dialog)', () => {
    plan = 'free';
    profile = { name: 'Ann', email: 'ann@example.com', preferences: {} };
    renderWithProviders(<Sync />);
    expect(updatePrefs).not.toHaveBeenCalled();
  });
});

describe('Default period: the period a new session starts with (Settings › Preferences)', () => {
  const Sync = () => {
    useSyncServerPreferences();
    return null;
  };
  const filters = (preset: DatePreset, fromDefault?: boolean) => ({ accountId: 'ALL', startDate: '2000-01-01', endDate: '2026-11-17', datePreset: preset, ...(fromDefault ? { fromDefault } : {}) });

  it('a session whose period nobody picked starts on the account default once the profile loads', () => {
    profile = { name: 'Ann', email: 'ann@example.com', preferences: { timeZone: 'UTC', defaultPeriod: '7d' } };
    const { store } = renderWithProviders(<Sync />, { preloadedState: { trades: { filters: filters('all', true) } } as never });
    expect((store.getState() as { trades: { filters: { datePreset: DatePreset } } }).trades.filters.datePreset).toBe(7);
  });

  it('a period the user picked in this session stays', () => {
    profile = { name: 'Ann', email: 'ann@example.com', preferences: { timeZone: 'UTC', defaultPeriod: '7d' } };
    const { store } = renderWithProviders(<Sync />, { preloadedState: { trades: { filters: filters('thisMonth') } } as never });
    expect((store.getState() as { trades: { filters: { datePreset: DatePreset } } }).trades.filters.datePreset).toBe('thisMonth');
  });

  it('a later change in Settings waits for the next session', () => {
    profile = { name: 'Ann', email: 'ann@example.com', preferences: { timeZone: 'UTC', defaultPeriod: '7d' } };
    const { store, rerender } = renderWithProviders(<Sync />, { preloadedState: { trades: { filters: filters('all', true) } } as never });
    profile = { name: 'Ann', email: 'ann@example.com', preferences: { timeZone: 'UTC', defaultPeriod: '30d' } };
    rerender(<Sync />);
    expect((store.getState() as { trades: { filters: { datePreset: DatePreset } } }).trades.filters.datePreset).toBe(7);
  });
});
