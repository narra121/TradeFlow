import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Insight } from '@/types/insights';
import { ReportBody } from '../ReportBody';
import { NotesSwitch } from '../NotesSwitch';
import { UNDO_MS } from '../useFindingFeedback';
import { reviewInsight } from './reviewFixtures';
import { PLAN_SIGNAL_EVENT } from '@/lib/planErrors';

const call = (value: unknown, fail = false) => ({ unwrap: () => (fail ? Promise.reject(value) : Promise.resolve(value)) });
const sendFeedback = vi.fn();
const setFocus = vi.fn();
const saveSettings = vi.fn();
let focus: { text: string; startedAt?: string } | null = null;
let settings: { data?: { useNotes: boolean }; isLoading: boolean; isError: boolean } = { data: { useNotes: false }, isLoading: false, isError: false };

vi.mock('@/store/api/insightsApi', () => ({
  useSendInsightFeedbackMutation: () => [sendFeedback],
  useSetFocusMutation: () => [setFocus, { isLoading: false }],
  useGetInsightSettingsQuery: () => ({ ...settings, refetch: vi.fn() }),
  useSetInsightSettingsMutation: () => [saveSettings, { isLoading: false }],
}));
vi.mock('@/store/api/analysisApi', () => ({ useGetFocusRuleQuery: () => ({ data: focus }) }));
let planReadOnly = false;
vi.mock('@/hooks/useEntitlements', () => ({ useEntitlements: () => ({ readOnly: planReadOnly }) }));

const openTrades = vi.fn();
const renderReport = (insight: Insight, useNotes = false) =>
  render(<ReportBody insight={insight} title="Week of 03 Nov · Zerodha F&O" currency="INR" onOpenTrades={openTrades} onMakeRule={vi.fn()} onCopy={vi.fn()} chat={null} useNotes={useNotes} />);
const blockTitles = () => screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);

beforeEach(() => {
  [sendFeedback, setFocus, saveSettings, openTrades].forEach((f) => f.mockReset());
  sendFeedback.mockReturnValue(call({}));
  setFocus.mockReturnValue(call({}));
  saveSettings.mockReturnValue(call({ useNotes: true }));
  focus = null;
  settings = { data: { useNotes: false }, isLoading: false, isError: false };
  planReadOnly = false;
});
afterEach(() => vi.useRealTimers());

describe('Weekly review (QA INR shape)', () => {
  it('shows the verdict, the one thing and the patterns to watch in that order, with the sample label and net in the basis line', () => {
    renderReport(reviewInsight());
    expect(blockTitles()).toEqual(['Verdict', 'The one thing', 'Patterns to watch · not enough trades to call']);
    expect(screen.getByText(/23 trades \(early: numbers will move a lot\) · net/)).toHaveTextContent('−₹56,787.78');
    expect(screen.getByText('A losing period, partly self-inflicted.')).toBeInTheDocument();
    const verdict = screen.getByRole('region', { name: 'Verdict' });
    expect(within(verdict).getByText('Result').nextSibling).toHaveTextContent('Losing · −₹56,787.78 · −12.57R over 23 trades with a stop');
    expect(within(verdict).getByText('Process').nextSibling).toHaveTextContent('Often broken · 5 of 23 trades without a process break · stop set on 100% · losses kept to the stop: 35%');
    // The summary repeats the verdict, so a review does not print it.
    expect(screen.queryByText(/A losing period of 23 trades/)).toBeNull();
  });

  it('the one thing: cost in money and R, its trades, the change since last week, what it merges and the if-then rule', async () => {
    renderReport(reviewInsight());
    const one = screen.getByRole('region', { name: 'The one thing' });
    expect(within(one).getByRole('heading', { name: 'Losses beyond the stop' })).toBeInTheDocument();
    expect(one).toHaveTextContent('11 trades · cost ₹26,382.89 (6.10R)');
    expect(within(one).getByText('Third week in a row · up from 7 trades last week')).toBeInTheDocument();
    expect(one).toHaveTextContent('Same trades as Tagged "FOMO" (4), Tagged "Late Entry" (1), Tagged "Overtrading" (2): their money is counted here once.');
    expect(one).toHaveTextContent('If-then rule: If price reaches my stop, I exit.');
    await userEvent.click(within(one).getByRole('button', { name: 'View 11 trades' }));
    expect(openTrades).toHaveBeenCalledWith(expect.arrayContaining(['b1', 'b11']));
  });

  it('a cost whose trades net to 0R shows the money only, never "(0.00R)"', () => {
    renderReport(reviewInsight({}, { theOne: { ...reviewInsight().review!.theOne!, trades: 2, cost: 104.58, costR: 0 } }));
    const one = screen.getByRole('region', { name: 'The one thing' });
    expect(one).toHaveTextContent('2 trades · cost ₹104.58');
    expect(one).not.toHaveTextContent('0.00R');
  });

  it('patterns to watch carry their trade count, how many more trades a verdict needs, and "paid so far"', () => {
    renderReport(reviewInsight());
    const watch = screen.getByRole('region', { name: /Patterns to watch/ });
    expect(within(watch).getAllByRole('heading', { level: 4 }).map((h) => h.textContent)).toEqual(['Fridays', 'Losers held longer than winners', 'Long trades', 'Tagged "Moved Stop Loss"']);
    expect(watch).toHaveTextContent('7 trades, 0 won · −₹51,006.18 · −1.38R a trade');
    expect(within(watch).getAllByText('Check again after 23 more trades.')).toHaveLength(2);
    expect(within(watch).getByText('Check again after 26 more trades.')).toBeInTheDocument();
    expect(watch).toHaveTextContent('It has paid so far; that is not evidence that it works.');
  });

  it('every block when present: last focus kept/broken/cost, keep doing, different from normal, notes, resolved and muted', async () => {
    const insight = reviewInsight({}, {
      more: [{ ...reviewInsight().review!.theOne!, key: 'detector:noStop', title: 'No stop recorded', trades: 3, tradeIds: ['n1', 'n2', 'n3'], cost: 800, costR: null, rule: { kind: 'setStop' }, ruleText: 'If I open a trade, I set a stop first.', history: { weeksInRow: 1, lastWeekCount: 7, status: 'down' }, overlaps: [] }],
      lastFocus: { rule: { kind: 'exitAtStop' }, ruleText: 'If price reaches my stop, I exit.', startedAt: '2026-11-01T04:00:00.000Z', checked: 11, kept: 8, broken: 3, brokenTradeIds: ['x1', 'x2', 'x3'], brokenNet: -9000, cost: 4200, text: 'Kept on 8 of 11 losing trades; the 3 breaks cost ₹4,200.00 beyond the stop.' },
      keepDoing: { key: 'segment:setup:pullback', title: 'Setup "Pullback"', trades: 42, periodTrades: 6, winRate: 0.62, avgR: 0.41, avgRRange: { lo: 0.12, hi: 0.7 }, label: 'provisional', text: 'Pullbacks made money over 42 trades.' },
      different: [{ key: 'different:tradesPerDay', measure: 'tradesPerDay', value: 4.2, normalLo: 1.5, normalHi: 3, weeks: 12, direction: 'above', text: 'You took 4.2 trades a day, above your usual 1.5 to 3.0.' }],
      fromNotes: [{ theme: 'Entries after missing the first move', side: 'losing', quotes: [{ tradeId: 't9', quote: 'chased it after the breakout' }] }],
      resolved: [{ key: 'detector:reentryAfterLoss', title: 'Re-entry after a loss', lastWeekCount: 4 }],
      muted: ['segment:symbol:nifty'],
    });
    renderReport(insight, true);
    expect(blockTitles()).toEqual(['Verdict', 'The one thing', 'Last week’s focus', 'Keep doing', 'Different from your normal · against your last 12 weeks', 'From your notes', 'Patterns to watch · not enough trades to call']);
    const one = screen.getByRole('region', { name: 'The one thing' });
    expect(within(one).getByText('Also costly')).toBeInTheDocument();
    expect(within(one).getByText('Down from 7 trades last week')).toBeInTheDocument();
    expect(within(one).getAllByRole('button', { name: 'Make this my focus' })).toHaveLength(1);
    expect(one).toHaveTextContent('Resolved since last week: Re-entry after a loss (4 trades last week, none this week).');
    const last = screen.getByRole('region', { name: 'Last week’s focus' });
    expect(last).toHaveTextContent('“If price reaches my stop, I exit.” since 01 Nov 2026');
    expect(last).toHaveTextContent('Kept8 of 11');
    expect(last).toHaveTextContent('Broken3');
    expect(last).toHaveTextContent('The breaks cost₹4,200.00');
    await userEvent.click(within(last).getByRole('button', { name: 'View the 3 trades that broke it' }));
    expect(openTrades).toHaveBeenCalledWith(['x1', 'x2', 'x3']);
    expect(screen.getByRole('region', { name: 'Keep doing' })).toHaveTextContent('42 trades · win rate 62% · avg +0.41R');
    expect(screen.getByRole('region', { name: /Different from your normal/ })).toHaveTextContent('4.2, above your usual 1.5–3.0');
    const notes = screen.getByRole('region', { name: 'From your notes' });
    expect(notes).toHaveTextContent('In losing trades');
    await userEvent.click(within(notes).getByRole('button', { name: 'Open trade' }));
    expect(openTrades).toHaveBeenLastCalledWith(['t9']);
    expect(screen.getByText(/1 finding you marked not useful is left out of this review/)).toBeInTheDocument();
  });

  it('a focus broken only by trades that lost nothing shows no "The breaks cost $0.00" (L23-003)', () => {
    renderReport(reviewInsight({}, { lastFocus: { rule: { kind: 'pauseAfterLoss', minutes: 15 }, ruleText: 'If a trade closes at a loss, I wait 15 minutes before the next entry.', startedAt: '2026-10-12T00:00:00.000Z', checked: 6, kept: 5, broken: 1, brokenTradeIds: ['x1'], brokenNet: 386, cost: 0, text: 'kept on 5 of 6 trades, broken on 1.' } }));
    const last = screen.getByRole('region', { name: 'Last week’s focus' });
    expect(last).toHaveTextContent('Broken1');
    expect(last).not.toHaveTextContent('The breaks cost');
  });

  it('prints the verdict once when its sentence is the headline (L23-005: the server falls back to the headline)', () => {
    const base = reviewInsight();
    renderReport(reviewInsight({}, { verdict: { ...base.review!.verdict, headline: 'A winning period, with process breaks.', text: 'A winning period, with process breaks.' } }));
    expect(screen.getAllByText('A winning period, with process breaks.')).toHaveLength(1);
  });

  it('outside a 7-day period it says "Your focus" and no week history', () => {
    renderReport(reviewInsight({ period: { from: '2026-10-01', to: '2026-10-31' } }, { lastFocus: { rule: { kind: 'setStop' }, ruleText: 'If I open a trade, I set a stop first.', startedAt: '2026-10-01T00:00:00.000Z', checked: 0, kept: 0, broken: 0, brokenTradeIds: [], brokenNet: 0, cost: 0, text: 'No trade was checked.' } }));
    expect(screen.getByRole('heading', { name: 'Your focus' })).toBeInTheDocument();
    expect(screen.getByText('No trade in this period could be checked against it.')).toBeInTheDocument();
    expect(screen.queryByText(/week in a row/)).toBeNull();
  });

  it('no costly behaviour says so; an empty notes block says no theme was found', () => {
    renderReport(reviewInsight({}, { theOne: null, more: [], fromNotes: [], watch: [] }));
    expect(screen.getByText('No behaviour cost money this period.')).toBeInTheDocument();
    expect(screen.getByText('Your notes in this period showed no clear theme.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /Patterns to watch/ })).toBeNull();
  });
});

describe('Make this my focus', () => {
  it('sends the finding’s rule, text and key, and is offered only when the rule can be checked', async () => {
    const { unmount } = renderReport(reviewInsight());
    await userEvent.click(screen.getByRole('button', { name: 'Make this my focus' }));
    expect(setFocus).toHaveBeenCalledWith({ rule: { kind: 'exitAtStop' }, text: 'If price reaches my stop, I exit.', findingKey: 'detector:beyondStop' });
    expect(await screen.findByText('Focus set')).toBeInTheDocument();
    unmount();
    renderReport(reviewInsight({}, { theOne: { ...reviewInsight().review!.theOne!, rule: null } }));
    expect(screen.queryByRole('button', { name: 'Make this my focus' })).toBeNull();
  });

  it('reads the active focus: the same rule shows since when, another rule says it will be replaced', () => {
    focus = { text: 'If price reaches my stop, I exit.', startedAt: '2026-11-10T03:00:00.000Z' };
    const { unmount } = renderReport(reviewInsight());
    expect(screen.queryByRole('button', { name: 'Make this my focus' })).toBeNull();
    expect(screen.getByText(/This is your focus since 10 Nov 2026/)).toBeInTheDocument();
    unmount();
    focus = { text: 'If I lose twice in a day, I stop.' };
    renderReport(reviewInsight());
    expect(screen.getByRole('button', { name: 'Make this my focus' })).toBeInTheDocument();
    expect(screen.getByText('Replaces your current focus: “If I lose twice in a day, I stop.”')).toBeInTheDocument();
  });

  it('a refused request says why', async () => {
    setFocus.mockReturnValue(call({ status: 400, data: { errorCode: 'VALIDATION_ERROR', message: 'text must be at most 200 characters.' } }, true));
    renderReport(reviewInsight());
    await userEvent.click(screen.getByRole('button', { name: 'Make this my focus' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('text must be at most 200 characters.');
  });
});

describe('Useful / Not useful', () => {
  const fridays = () => within(screen.getByRole('region', { name: /Patterns to watch/ })).getByRole('group', { name: 'Was “Fridays” useful?' });

  it('Useful is sent at once and shown pressed', async () => {
    renderReport(reviewInsight());
    const group = within(screen.getByRole('region', { name: 'The one thing' })).getByRole('group', { name: 'Was “Losses beyond the stop” useful?' });
    await userEvent.click(within(group).getByRole('button', { name: 'Useful' }));
    expect(sendFeedback).toHaveBeenCalledWith({ id: 'w1', key: 'detector:beyondStop', useful: true });
    expect(await within(group).findByRole('button', { name: 'Useful ✓' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('Not useful hides the finding at once; Undo inside the window sends nothing', () => {
    vi.useFakeTimers();
    renderReport(reviewInsight());
    fireEvent.click(within(fridays()).getByRole('button', { name: 'Not useful' }));
    expect(screen.queryByRole('heading', { name: 'Fridays' })).toBeNull();
    expect(screen.getByText(/Hidden: Fridays\. It will be left out of your reviews for 30 days\./)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByRole('heading', { name: 'Fridays' })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(UNDO_MS * 2));
    expect(sendFeedback).not.toHaveBeenCalled();
  });

  it('after the undo window the answer is sent and Show again takes it back', async () => {
    vi.useFakeTimers();
    renderReport(reviewInsight());
    fireEvent.click(within(fridays()).getByRole('button', { name: 'Not useful' }));
    await act(async () => vi.advanceTimersByTime(UNDO_MS));
    expect(sendFeedback).toHaveBeenCalledWith({ id: 'w1', key: 'segment:weekday:fri', useful: false });
    expect(screen.getByText(/Hidden: Fridays\. Left out of your reviews for 30 days\./)).toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Show again' })));
    expect(sendFeedback).toHaveBeenLastCalledWith({ id: 'w1', key: 'segment:weekday:fri', useful: true });
    expect(screen.getByRole('heading', { name: 'Fridays' })).toBeInTheDocument();
  });

  it('a failed send puts the finding back and says so', async () => {
    vi.useFakeTimers();
    sendFeedback.mockReturnValue(call({ status: 500 }, true));
    renderReport(reviewInsight());
    fireEvent.click(within(fridays()).getByRole('button', { name: 'Not useful' }));
    await act(async () => vi.advanceTimersByTime(UNDO_MS));
    expect(screen.getByRole('heading', { name: 'Fridays' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t hide this finding, so it is shown again. Try again.');
  });

  it('leaving the report inside the undo window still sends the answer', () => {
    vi.useFakeTimers();
    const { unmount } = renderReport(reviewInsight());
    fireEvent.click(within(fridays()).getByRole('button', { name: 'Not useful' }));
    expect(sendFeedback).not.toHaveBeenCalled();
    unmount();
    expect(sendFeedback).toHaveBeenCalledWith({ id: 'w1', key: 'segment:weekday:fri', useful: false });
  });

  it('a finding answered Not useful earlier stays hidden with Show again', () => {
    renderReport(reviewInsight({ feedback: { 'segment:weekday:fri': false, 'detector:beyondStop': true } }));
    expect(screen.queryByRole('heading', { name: 'Fridays' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Show again' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Useful ✓' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('What a report sends (Use my notes)', () => {
  const how = () => screen.getByText(/which writes the wording/);

  it('names OpenRouter and OpenAI, and the notes sentence follows the switch', () => {
    const { unmount } = renderReport(reviewInsight(), false);
    expect(how()).toHaveTextContent('are sent through OpenRouter to OpenAI, which writes the wording.');
    expect(how()).toHaveTextContent('Your notes and key lessons are sent only if you switch on Use my notes.');
    expect(how()).not.toHaveTextContent(/Gemini/);
    unmount();
    renderReport(reviewInsight(), true);
    expect(how()).toHaveTextContent('Use my notes is on: new reports also send the notes and key lessons of their trades.');
  });

  it('a report that used the notes says so, whatever the switch is now', () => {
    renderReport(reviewInsight({}, { fromNotes: [] }), false);
    expect(how()).toHaveTextContent('This report used your notes');
  });

  it('an old report without a review keeps its findings list and the same wording', () => {
    const old: Insight = { id: 'o1', createdAt: '2026-10-02T00:00:00.000Z', period: { from: '2026-09-01', to: '2026-09-30' }, accountId: 'a1', summary: 'Old summary.', model: 'm', tradeCount: 30, sections: [{ kind: 'leak', title: 'Trades after 20:00 lose', body: 'Most followed a loss.', tradeIds: ['t1'] }] };
    renderReport(old);
    expect(screen.getByText('Old summary.')).toBeInTheDocument();
    expect(screen.getByText('Leak')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Make this a rule' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Verdict' })).toBeNull();
    expect(how()).toHaveTextContent('sent only if you switch on Use my notes');
  });
});

describe('after the trial (read-only)', () => {
  const opened = () => {
    const seen = vi.fn();
    window.addEventListener(PLAN_SIGNAL_EVENT, (e) => seen((e as CustomEvent).detail.code), { once: true });
    return seen;
  };

  it('Make this my focus opens the upgrade dialog and sends nothing', async () => {
    planReadOnly = true;
    renderReport(reviewInsight());
    const seen = opened();
    await userEvent.click(screen.getByRole('button', { name: 'Make this my focus' }));
    expect(seen).toHaveBeenCalledWith('TRIAL_EXPIRED');
    expect(setFocus).not.toHaveBeenCalled();
  });

  it('Useful / Not useful open the upgrade dialog and send nothing', async () => {
    planReadOnly = true;
    renderReport(reviewInsight());
    const group = within(screen.getByRole('region', { name: 'The one thing' })).getByRole('group', { name: 'Was “Losses beyond the stop” useful?' });
    const seen = opened();
    await userEvent.click(within(group).getByRole('button', { name: 'Useful' }));
    expect(seen).toHaveBeenCalledWith('TRIAL_EXPIRED');
    expect(sendFeedback).not.toHaveBeenCalled();
  });

  it('the Use my notes switch opens the upgrade dialog and saves nothing', async () => {
    planReadOnly = true;
    render(<NotesSwitch />);
    const seen = opened();
    await userEvent.click(screen.getByRole('switch', { name: 'Use my notes' }));
    expect(seen).toHaveBeenCalledWith('TRIAL_EXPIRED');
    expect(saveSettings).not.toHaveBeenCalled();
  });
});

describe('Use my notes switch', () => {
  it('is off by default and says what switching it on sends, to whom', async () => {
    render(<NotesSwitch />);
    const sw = screen.getByRole('switch', { name: 'Use my notes' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
    expect(sw).toHaveAccessibleDescription(/through OpenRouter to OpenAI.*Chat never sends them/);
    await userEvent.click(sw);
    expect(saveSettings).toHaveBeenCalledWith({ useNotes: true });
  });

  it('on: says so; a failed save says the switch did not change', async () => {
    settings = { data: { useNotes: true }, isLoading: false, isError: false };
    saveSettings.mockReturnValue(call({ status: 500 }, true));
    render(<NotesSwitch />);
    const sw = screen.getByRole('switch', { name: 'Use my notes' });
    expect(sw).toHaveAttribute('aria-checked', 'true');
    expect(sw).toHaveAccessibleDescription(/^On\./);
    await userEvent.click(sw);
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t switch it off. It is still on.');
  });

  it('is disabled while loading and when the setting cannot be read', () => {
    settings = { data: undefined, isLoading: true, isError: false };
    const { unmount } = render(<NotesSwitch />);
    expect(screen.getByRole('switch', { name: 'Use my notes' })).toBeDisabled();
    unmount();
    settings = { data: undefined, isLoading: false, isError: true };
    render(<NotesSwitch />);
    expect(screen.getByRole('switch', { name: 'Use my notes' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t load this setting.');
  });
});
