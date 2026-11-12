import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IncidentBar } from '../IncidentBar';

const serve = (body: unknown) => vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => body })));

describe('IncidentBar', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('renders nothing for an empty status file', async () => {
    serve({});
    const { container } = render(<IncidentBar />);
    await Promise.resolve();
    expect(container).toBeEmptyDOMElement();
  });

  it('announces the message and remembers the dismissal per id', async () => {
    serve({ id: 'i1', level: 'maintenance', message: 'Planned maintenance at 02:00 UTC' });
    const { unmount } = render(<IncidentBar />);
    expect(await screen.findByRole('status')).toHaveTextContent('Planned maintenance at 02:00 UTC');
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss incident notice' }));
    expect(screen.queryByRole('status')).toBeNull();
    unmount();
    render(<IncidentBar />);
    await Promise.resolve();
    expect(screen.queryByRole('status')).toBeNull();
  });
});
