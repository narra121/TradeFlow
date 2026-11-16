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
});
