import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { useHashScroll } from '../useHashScroll';

function Page({ name }: { name: string }) {
  useHashScroll();
  return (
    <div>
      <h1>{name}</h1>
      <h3 id="drawdown">Drawdown</h3>
      <Link to="/other">go other</Link>
      <Link to="/other#drawdown">go other drawdown</Link>
    </div>
  );
}

const setup = (route = '/') =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/" element={<Page name="home" />} />
        <Route path="/other" element={<Page name="other" />} />
        <Route path="*" element={<Page name="any" />} />
      </Routes>
    </MemoryRouter>,
  );

describe('useHashScroll', () => {
  const scrollTo = vi.fn();

  beforeEach(() => {
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
    Element.prototype.scrollIntoView = vi.fn();
    scrollTo.mockClear();
  });

  afterEach(() => vi.useRealTimers());

  it('opens a page reached by a link at the top (FE-029)', async () => {
    setup();
    expect(scrollTo).not.toHaveBeenCalled(); // first load: the browser restores its own position
    await userEvent.click(screen.getByText('go other'));
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('scrolls to the hash target instead of the top', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    setup();
    await userEvent.click(screen.getByText('go other drawdown'));
    await act(async () => {
      vi.runAllTimers();
    });
    expect(scrollTo).not.toHaveBeenCalled();
    expect(document.getElementById('drawdown')!.scrollIntoView).toHaveBeenCalled();
  });

  it('does not throw on a malformed hash and still looks for the target (FE-071)', async () => {
    vi.useFakeTimers();
    expect(() => setup('/guide#100%')).not.toThrow();
    await act(async () => {
      vi.runAllTimers();
    });
    expect(screen.getByRole('heading', { name: 'any' })).toBeInTheDocument();
  });
});
