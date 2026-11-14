import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { useContentScroll } from '../useContentScroll';

function Frame() {
  useContentScroll();
  const navigate = useNavigate();
  return (
    <>
      <h1 id="page-title" tabIndex={-1}>Title</h1>
      <input aria-label="field" />
      <Link to="/b">next</Link>
      <button type="button" onClick={() => navigate(-1)}>back</button>
      <button type="button" onClick={() => navigate(1)}>forward</button>
    </>
  );
}

let list: HTMLElement;
const scrollTo = vi.fn();

function mount() {
  const view = render(
    <MemoryRouter initialEntries={['/a']}>
      <Routes>
        <Route path="*" element={<Frame />} />
      </Routes>
    </MemoryRouter>,
  );
  list.scrollTop = 1000;
  return view;
}

beforeEach(() => {
  list = document.createElement('div');
  list.setAttribute('data-trade-list', '');
  Object.defineProperty(list, 'clientHeight', { value: 800 });
  Object.defineProperty(list, 'scrollHeight', { value: 3000 });
  list.scrollTo = scrollTo as unknown as typeof list.scrollTo;
  document.body.append(list);
  scrollTo.mockClear();
});

afterEach(() => list.remove());

describe('useContentScroll', () => {
  it.each([
    ['PageDown', {}, { top: 1700 }],
    ['PageUp', {}, { top: 300 }],
    [' ', {}, { top: 1700 }],
    [' ', { shiftKey: true }, { top: 300 }],
    ['ArrowDown', {}, { top: 1040 }],
    ['ArrowUp', {}, { top: 960 }],
    ['Home', {}, { top: 0 }],
    ['End', {}, { top: 3000 }],
  ])('%s with the page title focused scrolls the list', (key, init, expected) => {
    const { getByRole } = mount();
    const title = getByRole('heading');
    title.focus();
    const notCancelled = fireEvent.keyDown(title, { key, ...init });
    expect(scrollTo).toHaveBeenCalledWith(expected);
    expect(notCancelled).toBe(false);
  });

  it('scrolls the list when no element has focus', () => {
    mount();
    fireEvent.keyDown(document.body, { key: 'PageDown' });
    expect(scrollTo).toHaveBeenCalledWith({ top: 1700 });
  });

  it('leaves keys alone in a field, with a modifier, for other keys, or while a dialog or an alert dialog is open', () => {
    const { getByLabelText } = mount();
    fireEvent.keyDown(getByLabelText('field'), { key: 'PageDown' });
    fireEvent.keyDown(document.body, { key: 'PageDown', ctrlKey: true });
    fireEvent.keyDown(document.body, { key: 'a' });
    for (const role of ['dialog', 'alertdialog']) {
      const dialog = document.createElement('div');
      dialog.setAttribute('role', role);
      dialog.setAttribute('data-state', 'open');
      document.body.append(dialog);
      fireEvent.keyDown(document.body, { key: 'PageDown' });
      dialog.remove();
    }
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('sends the page keys to the message log when the page has one (chat), not to the list', () => {
    const log = document.createElement('div');
    log.setAttribute('role', 'log');
    Object.defineProperty(log, 'clientHeight', { value: 400 });
    Object.defineProperty(log, 'scrollHeight', { value: 2000 });
    log.scrollTop = 100;
    const logScrollTo = vi.fn();
    log.scrollTo = logScrollTo as unknown as typeof log.scrollTo;
    list.append(log);
    mount();
    fireEvent.keyDown(document.body, { key: 'PageDown' });
    expect(logScrollTo).toHaveBeenCalledWith({ top: 450 });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('opens a page reached by a link at the top', () => {
    const { getByText } = mount();
    expect(scrollTo).not.toHaveBeenCalled();
    fireEvent.click(getByText('next'));
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  describe('Back and Forward', () => {
    const scrollList = (top: number) => {
      list.scrollTop = top;
      fireEvent.scroll(list);
    };

    it('return each entry to where it was left, not to where the page after it was scrolled', () => {
      const { getByText } = mount();
      scrollList(1500);
      fireEvent.click(getByText('next'));
      scrollList(200);
      fireEvent.click(getByText('back'));
      expect(list.scrollTop).toBe(1500);
      fireEvent.click(getByText('forward'));
      expect(list.scrollTop).toBe(200);
    });

    it('open an entry that was never scrolled at its top', () => {
      const { getByText } = mount();
      fireEvent.click(getByText('next'));
      scrollList(700);
      fireEvent.click(getByText('back'));
      expect(list.scrollTop).toBe(0);
    });

    it('keep trying while the page is too short to reach the saved position, then stop', () => {
      vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] });
      const { getByText } = mount();
      scrollList(1500);
      fireEvent.click(getByText('next'));
      scrollList(200);
      // A list that is still loading: it cannot be scrolled past 400 until its content arrives.
      let max = 400;
      let top = 0;
      Object.defineProperty(list, 'scrollTop', { configurable: true, get: () => top, set: (v: number) => (top = Math.min(v, max)) });
      fireEvent.click(getByText('back'));
      expect(top).toBe(400);
      max = 3000;
      act(() => void vi.advanceTimersByTime(40));
      expect(top).toBe(1500);
      vi.useRealTimers();
    });
  });
});
