import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

const props = vi.hoisted(() => ({ last: undefined as Record<string, unknown> | undefined }));
const mobile = vi.hoisted(() => ({ value: false }));
vi.mock('sonner', () => ({ Toaster: (p: Record<string, unknown>) => ((props.last = p), null), toast: vi.fn() }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => mobile.value }));

import { Toaster } from '../sonner';

describe('Toaster (FE-074)', () => {
  it('is always dark: the app has one theme and no ThemeProvider', () => {
    render(<Toaster />);
    expect(props.last?.theme).toBe('dark');
  });

  it('draws toasts on the popover surface with the overlay shadow (D.1 level 1)', () => {
    render(<Toaster />);
    const toast = (props.last?.toastOptions as { classNames: { toast: string } }).classNames.toast;
    expect(toast).toContain('group-[.toaster]:bg-popover');
    expect(toast).toContain('group-[.toaster]:shadow-overlay');
    expect(toast).not.toMatch(/bg-background|shadow-lg/);
  });

  it('follows the window size instead of the width at the first render', () => {
    mobile.value = false;
    const { rerender } = render(<Toaster />);
    expect(props.last?.position).toBe('bottom-left');
    mobile.value = true;
    rerender(<Toaster />);
    expect(props.last?.position).toBe('top-center');
  });
});
