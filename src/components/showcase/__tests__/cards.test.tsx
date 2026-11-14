import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { FIXED_STARTERS, toolsLine } from '@/lib/ai/chatFormat';
import { ACCOUNT_SAMPLE_TEXT, evidenceOf } from '@/lib/evidence';
import { BEHAVIOUR_ALT, BehaviourBoardCard, EDGE_ALT, EdgeCard } from '../AnswerCards';
import { CHAT_ALT, CHAT_ANSWER, CHAT_QUESTION, CHAT_WORKING, ChatAnswerDemo, REPLAY_RESULT, REPLAY_RULE, REVIEW_ALT, WHATIF_ALT, WeeklyReviewDemo, WhatIfDemo } from '../RuleCards';
import { SAMPLE_FOCUS_TEXT, SAMPLE_LABEL_TEXT } from '../sampleAnalysis';

// jsdom has no layout observers; the stages only need them to exist. Without a script a stage shows its poster.
beforeAll(() => {
  class NoopObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  vi.stubGlobal('ResizeObserver', NoopObserver);
  vi.stubGlobal('IntersectionObserver', NoopObserver);
});

const text = (el: HTMLElement) => (el.textContent ?? '').replace(/\s+/g, ' ');
const inert = (el: HTMLElement) => {
  expect(el.querySelectorAll('h1,h2,h3,h4,h5,h6')).toHaveLength(0);
  expect(el.querySelectorAll('a,input,select,textarea,[tabindex]')).toHaveLength(0);
};

describe('answer cards (stills)', () => {
  it('shows the edge with its ranges, the sample label and what is still missing', () => {
    const { container } = render(<EdgeCard />);
    const t = text(container);
    expect(t).toContain('Do I have an edge?');
    expect(SAMPLE_LABEL_TEXT).toEqual(ACCOUNT_SAMPLE_TEXT);
    expect(t).toContain(`${ACCOUNT_SAMPLE_TEXT.early} · 29 trades`);
    expect(t).toContain('58.6%');
    expect(t).toContain('Range 40.7%–74.5%');
    expect(t).toContain('37.7%');
    expect(t).toContain('+0.26R');
    expect(t).toContain('Range −0.07R to +0.61R');
    expect(t).toContain('Not proven yet: about 48 trades with a stop would be needed at this spread; you have 29.');
    inert(container);
  });

  it('lists the costliest behaviours with money and R against normal, in the words the app uses under 30 trades', () => {
    const { container } = render(<BehaviourBoardCard />);
    const t = text(container);
    expect(t).toContain('What do I do that costs money?');
    for (const row of ['Broken rules−$118.25', 'Losses beyond the stop−$104.75', 'Re-entry after a loss−$64.25']) expect(t).toContain(row);
    expect(t).toContain('−0.53R vs +0.39R');
    expect(t).toContain(`4 trades · ${evidenceOf('watch', 4).text.toLowerCase()}`);
    expect(t).not.toMatch(/\bleak\b|\bedge\b/i);
    inert(container);
  });

  it('describes both pictures as sample data with the same figures', () => {
    expect(EDGE_ALT).toMatch(/^Sample data: /);
    expect(EDGE_ALT).toContain('expectancy +0.26R per trade with a range of −0.07R to +0.61R, not proven yet.');
    expect(BEHAVIOUR_ALT).toMatch(/^Sample data: /);
    expect(BEHAVIOUR_ALT).toContain('re-entry after a loss, 4 trades, −$64.25');
  });
});

describe('rule cards (posters)', () => {
  it('replays a rule and says plainly that it would have cost money', () => {
    const { container } = render(<WhatIfDemo play={false} />);
    const t = text(container);
    expect(t).toContain('What if I had followed a rule?');
    expect(t).toContain(REPLAY_RULE);
    expect(t).toContain('+$370.50');
    expect(t).toContain('9 of 29');
    expect(REPLAY_RESULT).toBe('Without those 9 trades the period would have ended $30.75 lower.');
    expect(t).toContain(REPLAY_RESULT);
    expect(WHATIF_ALT).toContain('actual net +$370.50, replayed net +$339.75, 9 of 29 trades not taken.');
    inert(container);
  });

  it('ends the weekly review on the follow-up: the focus rule, kept and broken, and the cost of the breaks', () => {
    const { container } = render(<WeeklyReviewDemo play={false} />);
    const t = text(container);
    expect(t).toContain('Weekly review · 9 – 13 Nov');
    expect(t).toContain('A winning week, with process breaks.');
    expect(t).toContain('12 trades · +$113.05');
    expect(t).toContain(`Last week’s focus“${SAMPLE_FOCUS_TEXT}”`);
    expect(t).toContain('Kept on 10 of 12 trades');
    expect(t).toContain('Broken on 2, which cost $15.75');
    expect(t).toContain('Broke "Trade with the 1-hour trend"');
    expect(t).toContain('4 trades · −$76.25');
    expect(REVIEW_ALT).toMatch(/^Sample data: the weekly review of 2 – 6 Nov names re-entry after a loss as the one thing/);
    expect(REVIEW_ALT).toContain('kept on 10 of 12 trades and broken on 2, which cost $15.75.');
    inert(container);
  });

  it('answers one of the app’s own starter questions with a calculated table and its sample size', () => {
    expect(FIXED_STARTERS).toContain(CHAT_QUESTION);
    expect(CHAT_WORKING).toBe(toolsLine(['sequence']));
    const { container } = render(<ChatAnswerDemo play={false} />);
    const t = text(container);
    expect(t).toContain(CHAT_QUESTION);
    expect(CHAT_ANSWER).toBe('After a loss the same day: 8 trades, 4 won, net +$50.25. Too early to rely on.');
    expect(t).toContain('After a loss the same day8+$50.25+0.08R');
    expect(t).toContain('All other trades21+$320.25+0.33R');
    expect(t).toContain(CHAT_WORKING);
    expect(t).toContain(`Table 1 · ${ACCOUNT_SAMPLE_TEXT['too-few']}`);
    expect(CHAT_ALT).toMatch(/^Sample data: /);
    // Every number in the sentence is in the table or is its count of wins: the model adds none.
    expect(CHAT_ANSWER.match(/\d+(?:\.\d+)?/g)).toEqual(['8', '4', '50.25']);
    inert(container);
  });

  it('gives no advice and promises no result', () => {
    const { container } = render(
      <>
        <WhatIfDemo play={false} />
        <WeeklyReviewDemo play={false} />
        <ChatAnswerDemo play={false} />
      </>,
    );
    expect(text(container)).not.toMatch(/\b(buy|sell|should|guarantee|will improve|profitable)\b/i);
  });
});
