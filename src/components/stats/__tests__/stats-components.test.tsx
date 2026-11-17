import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Delta } from '../Delta';
import { Meter } from '../Meter';
import { MetricInfo } from '../MetricInfo';
import { StatCell, StatStrip } from '../StatStrip';
import { CompareSwitch } from '../CompareSwitch';
import { useCompare } from '../useCompare';

const wrap = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('MetricInfo', () => {
  it('is a button named by the metric and opens the definition, formula and glossary link', async () => {
    const user = userEvent.setup();
    wrap(<MetricInfo metric="expectancy" sample="68 trades" />);
    await user.click(screen.getByRole('button', { name: 'Expectancy' }));
    expect(await screen.findByText(/average trade has made/i)).toBeInTheDocument();
    expect(screen.getByText(/win rate × average win/i)).toBeInTheDocument();
    expect(screen.getByText('68 trades')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /glossary/i })).toHaveAttribute('href', '/glossary#expectancy');
  });

  it('closes on Escape and returns focus to the label', async () => {
    const user = userEvent.setup();
    wrap(<MetricInfo metric="winRate" />);
    const trigger = screen.getByRole('button', { name: 'Win rate' });
    await user.click(trigger);
    await screen.findByText(/share of trades/i);
    await user.keyboard('{Escape}');
    expect(screen.queryByText(/share of trades/i)).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('can print a different label than the metric name', () => {
    wrap(<MetricInfo metric="plannedRR" label="Planned R:R" />);
    expect(screen.getByRole('button', { name: 'Planned R:R' })).toBeInTheDocument();
  });

  it('inside a sentence its 44 px touch target does not grow the line (padding cancelled by margin, no min height)', () => {
    wrap(<p>A note on <MetricInfo metric="expectancy" /> in a sentence.</p>);
    const cls = screen.getByRole('button', { name: 'Expectancy' }).className;
    expect(cls).toContain('[@media(pointer:coarse)]:py-[calc((2.75rem-1lh)/2)]');
    expect(cls).toContain('[@media(pointer:coarse)]:-my-[calc((2.75rem-1lh)/2)]');
    expect(cls).not.toContain('[@media(pointer:coarse)]:min-h-11');
  });
});

describe('StatStrip', () => {
  it('is a dl of cells with a labelled button, a linked value and a spoken delta', () => {
    wrap(
      <StatStrip label="Period statistics">
        <StatCell metric="netPnl" to="/app/analytics" value="+$1,412.30" delta={<Delta kind="money" current={10} previous={5} currency="USD" name="Oct" spokenName="October" />} />
      </StatStrip>,
    );
    expect(screen.getByLabelText('Period statistics').tagName).toBe('DL');
    expect(screen.getByRole('button', { name: 'Net P&L' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '+$1,412.30' })).toHaveAttribute('href', '/app/analytics');
    expect(screen.getByText('up $5.00 versus October')).toHaveClass('sr-only');
  });
});

describe('Meter', () => {
  it('exposes its value to assistive tech and flags a limit that is exceeded', () => {
    const { container } = render(<Meter value={9} max={8} limit label="Trades: 9 of 8" />);
    const meter = screen.getByRole('meter', { name: 'Trades: 9 of 8' });
    expect(meter).toHaveAttribute('aria-valuemax', '8');
    expect(meter).toHaveAttribute('aria-valuenow', '8');
    expect(container.querySelector('.bg-loss')).not.toBeNull();
  });
});

describe('Compare preference', () => {
  it('is on by default, shared by every consumer, and persisted', () => {
    localStorage.removeItem('tq.compare');
    const a = renderHook(() => useCompare());
    const b = renderHook(() => useCompare());
    expect(a.result.current[0]).toBe(true);
    act(() => a.result.current[1](false));
    expect(b.result.current[0]).toBe(false);
    expect(localStorage.getItem('tq.compare')).toBe('off');
    act(() => a.result.current[1](true));
  });

  it('the switch toggles it', () => {
    render(<CompareSwitch />);
    const sw = screen.getByRole('switch', { name: 'Compare: previous period' });
    expect(sw).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(sw);
    expect(sw).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(sw);
    // 44x44 on touch around the 36x20 track (36x20 measured on dev at 390).
    expect(sw.className).toContain('[@media(pointer:coarse)]:min-h-11');
    expect(sw.className).toContain('[@media(pointer:coarse)]:min-w-11');
  });
});
