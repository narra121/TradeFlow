import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
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
    </>
  );
}

let list: HTMLElement;
const scrollTo = vi.fn();

function mount() {
  return render(
    <MemoryRouter initialEntries={['/a']}>
      <Routes>
        <Route path="*" element={<Frame />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  list = document.createElement('div');
  list.setAttribute('data-trade-list', '');
  Object.defineProperty(list, 'clientHeight', { value: 800 });
  Object.defineProperty(list, 'scrollHeight', { value: 3000 });
  list.scrollTop = 1000;
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

  it('leaves keys alone in a field, with a modifier, for other keys, or while a dialog is open', () => {
    const { getByLabelText } = mount();
    fireEvent.keyDown(getByLabelText('field'), { key: 'PageDown' });
    fireEvent.keyDown(document.body, { key: 'PageDown', ctrlKey: true });
    fireEvent.keyDown(document.body, { key: 'a' });
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('data-state', 'open');
    document.body.append(dialog);
    fireEvent.keyDown(document.body, { key: 'PageDown' });
    dialog.remove();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('opens a page reached by a link at the top and leaves Back where the list was', () => {
    const { getByText } = mount();
    expect(scrollTo).not.toHaveBeenCalled();
    fireEvent.click(getByText('next'));
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    scrollTo.mockClear();
    fireEvent.click(getByText('back'));
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
