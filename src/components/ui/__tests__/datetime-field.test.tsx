import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { patchUiState, resetUiStateCache } from '@/hooks/useUiState';
import { browserZone } from '@/components/settings/timeZones';
import { DateTimeField } from '../datetime-field';

// 2026-11-03 20:30 UTC: 09:30 on the 3rd in Pago Pago (UTC−11), 10:30 on the 4th in Kiritimati (UTC+14).
const AT = new Date('2026-11-03T20:30:00.000Z');
const ZONE = browserZone() === 'Pacific/Pago_Pago' ? 'Pacific/Kiritimati' : 'Pacific/Pago_Pago';
const EXPECTED = ZONE === 'Pacific/Pago_Pago' ? '2026-11-03T09:30' : '2026-11-04T10:30';

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
  resetUiStateCache();
});

describe('DateTimeField reads "now" on the Settings time zone clock', () => {
  it('Now fills the current minute of the Settings zone, not of the browser', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(AT);
    patchUiState({ timeZone: ZONE });
    const onChange = vi.fn();
    render(<DateTimeField value="" onChange={onChange} showNow />);
    fireEvent.click(screen.getByRole('button', { name: 'Now' }));
    expect(onChange).toHaveBeenCalledWith(EXPECTED);
  });

  it('an empty field opens the calendar on the Settings zone\'s month, with its today marked', () => {
    // 2026-12-01 05:30 UTC: still 30 November in Pago Pago, already 1 December in Kiritimati and in the browser zones east of UTC−5.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-12-01T05:30:00.000Z'));
    patchUiState({ timeZone: ZONE });
    const [month, day] = ZONE === 'Pacific/Pago_Pago' ? ['November 2026', '30'] : ['December 2026', '1'];
    render(<DateTimeField value="" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pick a date' }));
    expect(screen.getByText(month)).toBeInTheDocument();
    const today = screen.getAllByRole('gridcell', { name: day }).find((el) => !el.className.includes('day-outside'));
    expect(today?.className).toContain('font-semibold');
  });
});
