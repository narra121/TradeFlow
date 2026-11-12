import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaneFrame, SidePaneLayout } from '../SidePane';

let observed: ((entries: unknown[]) => void) | null = null;
let width = 1200;
let clientWidth: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  class RO {
    constructor(cb: (entries: unknown[]) => void) {
      observed = cb;
    }
    observe() {
      observed?.([]);
    }
    disconnect() {}
  }
  vi.stubGlobal('ResizeObserver', RO);
  clientWidth = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => width);
});
afterEach(() => {
  vi.unstubAllGlobals();
  clientWidth.mockRestore();
});

const pane = <PaneFrame title="Wed 4 Nov" closeLabel="Close day" onClose={vi.fn()}>body</PaneFrame>;

describe('PaneFrame', () => {
  it('has the trade pane header: a title, actions and a named close button, then the body and the footer', async () => {
    const onClose = vi.fn();
    render(
      <PaneFrame title="New account" actions={<button>Edit</button>} closeLabel="Close account" onClose={onClose} footer={<button>Save</button>}>
        <p>content</p>
      </PaneFrame>,
    );
    expect(screen.getByRole('heading', { name: 'New account' })).toHaveAttribute('tabindex', '-1');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Close account' }));
    expect(onClose).toHaveBeenCalled();
    expect(screen.getByText('content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });
});

describe('SidePaneLayout', () => {
  it('renders only the content while closed', () => {
    render(<SidePaneLayout open={false} label="Day" minMain={600} pane={pane} onClose={vi.fn()}>main</SidePaneLayout>);
    expect(screen.getByText('main')).toBeInTheDocument();
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('docks the pane beside the content when it fits', () => {
    width = 1200;
    render(<SidePaneLayout open label="Day 4 November" minMain={600} pane={pane} onClose={vi.fn()}>main</SidePaneLayout>);
    expect(screen.getByRole('complementary', { name: 'Day 4 November' })).toHaveTextContent('body');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('becomes a sheet over the content when the content would be squeezed', async () => {
    width = 900;
    const onClose = vi.fn();
    render(<SidePaneLayout open label="Day 4 November" minMain={600} pane={pane} onClose={onClose}>main</SidePaneLayout>);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Day 4 November panel' })).toHaveTextContent('body');
    await userEvent.setup().keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
