import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../dialog';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '../alert-dialog';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '../sheet';
import { revealFromPinned } from '../data-table';

/** A dialog opened from state (no Trigger), as every settings dialog is. */
function Opener({ kind, onCloseAutoFocus }: { kind: 'dialog' | 'alert' | 'sheet'; onCloseAutoFocus?: (e: Event) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open it</button>
      <button type="button">Elsewhere</button>
      {kind === 'dialog' && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent onCloseAutoFocus={onCloseAutoFocus}>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Body</DialogDescription>
          </DialogContent>
        </Dialog>
      )}
      {kind === 'alert' && (
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogContent>
            <AlertDialogTitle>Title</AlertDialogTitle>
            <AlertDialogDescription>Body</AlertDialogDescription>
            {/* As the settings dialogs do: React focuses Cancel before Radix reports the open. */}
            <AlertDialogCancel autoFocus>Cancel</AlertDialogCancel>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {kind === 'sheet' && (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
            <SheetDescription>Body</SheetDescription>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}

describe('dialogs opened without a Trigger give focus back to the opener (WCAG 2.4.3)', () => {
  for (const kind of ['dialog', 'alert', 'sheet'] as const) {
    it(`${kind}: Esc returns focus to the button that opened it`, async () => {
      const user = userEvent.setup();
      render(<Opener kind={kind} />);
      const opener = screen.getByRole('button', { name: 'Open it' });
      opener.focus();
      await user.keyboard('{Enter}');
      await screen.findByText('Body');
      expect(opener).not.toHaveFocus();
      await user.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByText('Body')).toBeNull());
      await waitFor(() => expect(opener).toHaveFocus());
    });
  }

  it('a caller that places focus itself keeps that choice', async () => {
    const user = userEvent.setup();
    const place = vi.fn((e: Event) => {
      e.preventDefault();
      screen.getByRole('button', { name: 'Elsewhere' }).focus();
    });
    render(<Opener kind="dialog" onCloseAutoFocus={place} />);
    screen.getByRole('button', { name: 'Open it' }).focus();
    await user.keyboard('{Enter}');
    await screen.findByText('Body');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(place).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Elsewhere' })).toHaveFocus();
  });
});

describe('revealFromPinned', () => {
  const rect = (left: number, width: number) => ({ left, right: left + width, width, top: 0, bottom: 32, height: 32, x: left, y: 0, toJSON: () => ({}) }) as DOMRect;

  function table() {
    document.body.innerHTML = `<div id="s" style="overflow-x:auto"><table><thead><tr>
      <th id="pinL" style="position:sticky"></th><th id="mid"><button id="b">menu</button></th><th id="pinR" style="position:sticky"></th>
    </tr></thead></table></div>`;
    const s = document.getElementById('s') as HTMLElement;
    Object.defineProperty(s, 'scrollWidth', { value: 2000 });
    Object.defineProperty(s, 'clientWidth', { value: 1000 });
    s.scrollLeft = 500;
    const set = (id: string, r: DOMRect) => ((document.getElementById(id) as HTMLElement).getBoundingClientRect = () => r);
    set('pinL', rect(0, 100));
    set('pinR', rect(880, 120));
    return { s, set, b: document.getElementById('b') as HTMLElement };
  }

  it('scrolls a control out from under a pinned right column', () => {
    const { s, set, b } = table();
    set('mid', rect(820, 100));
    set('b', rect(890, 24));
    revealFromPinned(b);
    expect(s.scrollLeft).toBe(500 + (914 - 880) + 8);
  });

  it('scrolls a control out from under a pinned left column', () => {
    const { s, set, b } = table();
    set('mid', rect(60, 100));
    set('b', rect(70, 24));
    revealFromPinned(b);
    expect(s.scrollLeft).toBe(500 - (100 - 70) - 8);
  });

  it('leaves a visible control alone', () => {
    const { s, set, b } = table();
    set('mid', rect(400, 100));
    set('b', rect(420, 24));
    revealFromPinned(b);
    expect(s.scrollLeft).toBe(500);
  });
});

describe('Select keeps the hidden page out of reach while open (axe aria-hidden-focus)', () => {
  // jsdom has no layout: Radix Select scrolls the selected item into view on open.
  Element.prototype.scrollIntoView ??= () => undefined;

  it('makes what Radix marks aria-hidden inert while the list is open, and gives it back after', async () => {
    const { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } = await import('../select');
    function Page() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <div data-testid="page"><a href="#x">A link behind the list</a></div>
          <Select open={open} onOpenChange={setOpen} defaultValue="a">
            <SelectTrigger aria-label="Period"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="a">All time</SelectItem>
              <SelectItem value="b">This week</SelectItem>
            </SelectContent>
          </Select>
          <button type="button" onClick={() => setOpen(false)}>close</button>
        </>
      );
    }
    render(<Page />);
    await screen.findByRole('listbox');
    // Radix marks the body's other children, here the container holding the page.
    const hidden = () => screen.getByTestId('page').closest<HTMLElement>('[data-aria-hidden]');
    await waitFor(() => expect(hidden()?.getAttribute('aria-hidden')).toBe('true'));
    const region = hidden() as HTMLElement;
    await waitFor(() => expect(region.inert).toBe(true));
    await act(async () => screen.getByRole('option', { name: 'This week' }).click());
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    expect(region.inert).toBe(false);
    expect(region.getAttribute('aria-hidden')).toBeNull();
  });
});

describe('overlay titles use the type scale (D.1: pane and dialog titles 14 / 600; there is no 18 px step)', () => {
  for (const kind of ['dialog', 'alert', 'sheet'] as const) {
    it(kind, async () => {
      const user = userEvent.setup();
      render(<Opener kind={kind} />);
      await user.click(screen.getByRole('button', { name: 'Open it' }));
      const title = await screen.findByText('Title');
      expect(title).toHaveClass('text-sm', 'font-semibold');
      expect(title).not.toHaveClass('text-lg');
    });
  }
});
