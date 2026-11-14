import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Insight, InsightSection } from '@/types/insights';
import type { ChatSession } from '@/types/chat';
import { CHAT_STARTERS, FIXED_STARTERS, groupSessions, starterQuestions, toolsLine } from '../chatFormat';
import { clampedLabel, isMixedCurrency, KIND_LABEL, orderSections, periodLabel, reportAsText, reportRange, ruleTextFrom, tradesInMessage, trueMinus } from '../insightFormat';
import { citedTradeIds, parseBlocks, renderAnswer } from '../markdown';

const section = (p: Partial<InsightSection>): InsightSection => ({ kind: 'leak', title: 'T', body: 'B', ...p });
const metric = (value: number | null, unit: 'currency' | 'percent' = 'currency') => ({ label: 'L', value, unit, display: String(value) });

describe('periodLabel', () => {
  it('names a whole month, a whole year, a week and a free range', () => {
    expect(periodLabel('2026-10-01', '2026-10-31')).toBe('October 2026');
    expect(periodLabel('2026-01-01', '2026-12-31')).toBe('2026');
    expect(periodLabel('2026-10-26', '2026-11-01')).toBe('Week of 26 Oct');
    expect(periodLabel('2026-10-05', '2026-11-20')).toContain('–');
  });
  it('calls the open-ended All time period by name', () => expect(periodLabel('1990-01-01', '2026-11-11')).toBe('All time'));
});

describe('orderSections', () => {
  it('puts the largest money impact first, findings without a figure after, actions last', () => {
    const s = [
      section({ title: 'action', kind: 'action', metric: metric(9000) }),
      section({ title: 'small', metric: metric(-100) }),
      section({ title: 'none', kind: 'pattern', metric: metric(40, 'percent') }),
      section({ title: 'big', kind: 'strength', metric: metric(1240) }),
    ];
    expect(orderSections(s).map((x) => x.title)).toEqual(['big', 'small', 'none', 'action']);
  });
});

describe('ruleTextFrom, tradesInMessage, reportAsText', () => {
  it('phrases a leak as something to avoid and a strength as something to keep', () => {
    expect(ruleTextFrom(section({ title: 'Trades after 20:00 lose.' }))).toBe('Avoid this: trades after 20:00 lose');
    expect(ruleTextFrom(section({ kind: 'strength', title: 'Breakouts in London' }))).toBe('Keep doing this: breakouts in London');
  });
  it('reads the trade count out of the API message', () => {
    expect(tradesInMessage('At least 5 closed trades are needed for an insight; this period has 3.')).toBe(3);
    expect(tradesInMessage(undefined)).toBeNull();
  });
  it('copies the summary with each finding and the disclaimer', () => {
    const insight: Insight = { id: 'i', createdAt: '2026-11-02T00:00:00Z', period: { from: '2026-10-01', to: '2026-10-31' }, accountId: null, summary: 'Sum.', sections: [section({ title: 'Leak one', body: 'Body one' })], model: 'm', tradeCount: 68 };
    const text = reportAsText(insight, 'October 2026 · All accounts');
    expect(text).toContain('October 2026 · All accounts');
    expect(text).toContain(`${KIND_LABEL.leak}: Leak one`);
    expect(text.trim().endsWith('Not investment advice.')).toBe(true);
  });
});

describe('chat helpers', () => {
  const s = (id: string, updatedAt: string): ChatSession => ({ id, title: id, createdAt: updatedAt, updatedAt, messageCount: 1 });
  it('groups sessions Today / Yesterday / Earlier, newest first, without empty groups', () => {
    const now = new Date(2026, 10, 11, 12);
    const groups = groupSessions([s('old', new Date(2026, 9, 1).toISOString()), s('t1', new Date(2026, 10, 11, 9).toISOString()), s('t2', new Date(2026, 10, 11, 11).toISOString())], now);
    expect(groups.map((g) => g.label)).toEqual(['Today', 'Earlier']);
    expect(groups[0].sessions.map((x) => x.id)).toEqual(['t2', 't1']);
  });
  it('starts a chat with four questions one calculation answers; a chat about a report opens with up to two on its findings', () => {
    expect(starterQuestions(undefined)).toBe(CHAT_STARTERS);
    expect(CHAT_STARTERS).toEqual(['Which setup has made me the most money?', 'How do I do after a losing trade?', 'Which weekday costs me the most?', 'What if I stopped after 2 losses a day?']);
    const old = { sections: [section({ kind: 'strength', title: 'Good one' }), section({ title: 'Late trades lose.' })] } as Insight;
    expect(starterQuestions(old)).toEqual(['What is behind this: Late trades lose?', ...CHAT_STARTERS.slice(0, 3)]);
    const weekly = { sections: [], review: { theOne: { title: 'Losses beyond the stop' }, more: [{ title: 'No stop recorded' }] } } as unknown as Insight;
    expect(starterQuestions(weekly)).toEqual(['Which trades make up "Losses beyond the stop"?', 'Which trades make up "No stop recorded"?', ...CHAT_STARTERS.slice(0, 2)]);
  });
  it('a finding title with its own quotes does not nest double quotes in the starter', () => {
    const weekly = { sections: [], review: { theOne: { title: 'Tagged "Late Entry"' }, more: [] } } as unknown as Insight;
    expect(starterQuestions(weekly)[0]).toBe('Which trades make up "Tagged ‘Late Entry’"?');
  });
  it('the marketing demo keeps its own fixed questions', () => expect(FIXED_STARTERS[0]).toBe('What is my biggest leak this month?'));
  it('names the calculations of the tool frames once each, in plain words', () => {
    expect(toolsLine(['stats', 'whatIf', 'stats'])).toBe('Calculated: figures by group, a what-if replay');
    expect(toolsLine(['newTool'])).toBe('Calculated: newTool');
  });
});

describe('answer rendering', () => {
  it('parses paragraphs, bullet lists and numbered lists', () => {
    expect(parseBlocks('Intro\n\n- a\n- b\n\n1. one\n2. two')).toEqual([
      { type: 'p', text: 'Intro' },
      { type: 'ul', items: ['a', 'b'] },
      { type: 'ol', items: ['one', 'two'] },
    ]);
  });
  it('lists cited trades once, in order', () => expect(citedTradeIds('a [#t1] b [#t2] c [#t1]')).toEqual(['t1', 't2']));

  it('renders bold, code and trade chips, and never interprets HTML', async () => {
    const onTrade = vi.fn();
    const { container } = render(<div>{renderAnswer('**Loss** of `5R` on [#t9] <img src=x onerror=alert(1)>', { onTrade })}</div>);
    expect(container.querySelector('strong')?.textContent).toBe('Loss');
    expect(container.querySelector('code')?.textContent).toBe('5R');
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('<img src=x');
    await userEvent.click(screen.getByRole('button', { name: 'Open trade 1' }));
    expect(onTrade).toHaveBeenCalledWith('t9');
  });
});

describe('trueMinus and isMixedCurrency', () => {
  it('replaces the hyphen in front of a figure only, in any position a figure appears', () => {
    expect(trueMinus('net -55,679.06 (-1.5%) and Break-even -3')).toBe('net −55,679.06 (−1.5%) and Break-even −3');
    expect(trueMinus('long-term 2026-11-12')).toBe('long-term 2026-11-12');
  });
  it('is mixed only for no chosen account and more than one currency', () => {
    const accts = [{ currency: 'USD' }, { currency: 'INR' }];
    expect(isMixedCurrency(accts, null)).toBe(true);
    expect(isMixedCurrency(accts, 'a1')).toBe(false);
    expect(isMixedCurrency([{ currency: 'USD' }, { currency: 'USD' }], null)).toBe(false);
    expect(isMixedCurrency([], null)).toBe(false);
  });
});

describe('reportRange (the API takes at most 366 days)', () => {
  const today = new Date(2026, 10, 12);

  it('All time ends today and keeps its last 366 days', () => {
    const r = reportRange('all', '2000-01-01', '2026-11-12', today);
    expect(r).toEqual({ from: '2025-11-12', to: '2026-11-12', clamped: true });
    expect(Math.round((new Date(r.to).getTime() - new Date(r.from).getTime()) / 86_400_000) + 1).toBe(366);
  });

  it('leaves a period of up to 366 days alone', () => {
    expect(reportRange('thisMonth', '2026-11-01', '2026-11-30', today)).toEqual({ from: '2026-11-01', to: '2026-11-30', clamped: false });
    expect(reportRange('custom', '2025-11-12', '2026-11-12', today).clamped).toBe(false);
  });

  it('a longer custom period keeps the 366 days that end on its last day', () => {
    expect(reportRange('custom', '2024-01-01', '2026-06-30', today)).toEqual({ from: '2025-06-30', to: '2026-06-30', clamped: true });
  });

  it('labels the clamp: the last 12 months when it ends today, else the 12 months to the end date', () => {
    expect(clampedLabel('2026-11-12', today)).toBe('the last 12 months');
    expect(clampedLabel('2026-06-30', today)).toMatch(/^the 12 months to /);
  });
});
