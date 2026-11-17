import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

const chrome = vi.hoisted(() => vi.fn());
vi.mock('@/components/import/ImportCenter', () => ({ ImportCenter: () => null }));
vi.mock('@/components/shell/chrome', () => ({ usePageChrome: chrome }));
vi.mock('@/hooks/useEntitlements', () => ({
  useEntitlements: () => ({ usage: [{ feature: 'broker_import', used: 3, limit: 200 }], periodResetsAt: '2026-12-01T00:00:00.000Z' }),
}));

import { ImportView } from '../ImportView';

describe('ImportView', () => {
  it('prints the quota reset as an unpadded date that never wraps inside (L22-040)', () => {
    render(<ImportView />);
    expect(chrome).toHaveBeenCalledWith({ statement: expect.stringMatching(/^Broker imports this month: 3 of 200 · resets [1-9]\d?\u00a0(Nov|Dec)$/) });
  });
});
