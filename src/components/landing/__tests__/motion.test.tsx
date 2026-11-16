import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { LandingMotionProvider, MotionToggle, useConsentReserve, useLandingMotion } from '../motion';

const mockMedia = (matches: boolean) =>
  vi.stubGlobal('matchMedia', (query: string) => ({ matches, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }));

describe('LandingMotionProvider (FE-080)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('is paused from the first render under prefers-reduced-motion, not after an effect', () => {
    mockMedia(true);
    const seen: boolean[] = [];
    function Probe() {
      seen.push(useLandingMotion().still);
      return <MotionToggle />;
    }
    render(
      <LandingMotionProvider>
        <Probe />
      </LandingMotionProvider>,
    );
    expect(seen[0]).toBe(true);
    expect(screen.getByRole('button', { name: 'Play animations' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('plays otherwise', () => {
    mockMedia(false);
    render(
      <LandingMotionProvider>
        <MotionToggle />
      </LandingMotionProvider>,
    );
    expect(screen.getByRole('button', { name: 'Pause animations' })).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('useConsentReserve (L23-R1: landing controls stay above the consent panel)', () => {
  it('follows the height the consent panel reserves on the root element, and clears when it closes', async () => {
    const { result } = renderHook(() => useConsentReserve());
    expect(result.current).toBe('');
    act(() => {
      document.documentElement.style.scrollPaddingBottom = '318px';
    });
    await waitFor(() => expect(result.current).toBe('318px'));
    act(() => {
      document.documentElement.style.scrollPaddingBottom = '';
    });
    await waitFor(() => expect(result.current).toBe(''));
  });
});