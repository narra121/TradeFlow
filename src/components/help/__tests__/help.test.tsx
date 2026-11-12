import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SUPPORT_EMAIL } from '@/content/product-facts';
import { ContactSupportDialog } from '../ContactSupportDialog';
import { FeedbackDialog } from '../FeedbackDialog';
import { hasUnseenEntries, useWhatsNew } from '../useWhatsNew';
import { WhatsNewPopover } from '../WhatsNewPopover';
import { appVersion, supportMailto } from '../diagnostics';
import * as diagnostics from '../diagnostics';
import * as feedback from '../sendFeedback';

vi.mock('sonner', () => ({ toast: vi.fn() }));

// Radix checkboxes measure themselves; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const decode = (url: string) => {
  const u = new URL(url);
  return { to: u.pathname, subject: u.searchParams.get('subject') ?? '', body: u.searchParams.get('body') ?? '' };
};

describe('supportMailto', () => {
  it('addresses support with the subject and the route, version and browser, never trade data', () => {
    const m = decode(supportMailto('support', 'Help me', { page: '/app/import', appVersion: '2.0.0', userAgent: 'UA' }));
    expect(m.to).toBe(SUPPORT_EMAIL);
    expect(m.subject).toBe('TradeQut support request');
    expect(m.body).toContain('Help me');
    expect(m.body).toContain('Page: /app/import');
    expect(m.body).toContain('App version: 2.0.0');
  });

  it('names the kind in a feedback subject and leaves the details out when asked', () => {
    const m = decode(supportMailto('problem', 'x', null));
    expect(m.subject).toBe('TradeQut feedback: Problem');
    expect(m.body).toBe('x');
  });
});

describe('ContactSupportDialog', () => {
  it('shows the address, promises no response time and prefills the mail link with the message', async () => {
    render(<ContactSupportDialog open onOpenChange={() => undefined} />);
    expect(screen.getByRole('dialog', { name: 'Contact support' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: SUPPORT_EMAIL })[0]).toHaveAttribute('href', expect.stringContaining(`mailto:${SUPPORT_EMAIL}`));
    expect(screen.queryByText(/within a day|24 hours/i)).toBeNull();
    await userEvent.type(screen.getByRole('textbox', { name: /What do you need help with/ }), 'Import fails');
    const body = decode(screen.getByRole('link', { name: 'Open email' }).getAttribute('href')!).body;
    expect(body).toContain('Import fails');
    expect(body).toContain(`App version: ${appVersion()}`);
  });
});

describe('FeedbackDialog', () => {
  beforeEach(() => vi.restoreAllMocks());

  const setup = () => {
    const onOpenChange = vi.fn();
    render(<FeedbackDialog open onOpenChange={onOpenChange} />);
    return onOpenChange;
  };

  it('cannot be sent empty and limits the message to 2,000 characters', async () => {
    setup();
    expect(screen.getByRole('button', { name: 'Send feedback' })).toBeDisabled();
    await userEvent.click(screen.getByRole('textbox', { name: /Your message/ }));
    await userEvent.paste('a'.repeat(2001));
    expect(screen.getByText('Keep it under 2,000 characters.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send feedback' })).toBeDisabled();
  });

  it('sends kind, text and diagnostics and closes when the API accepts it', async () => {
    const send = vi.spyOn(feedback, 'sendFeedback').mockResolvedValue('sent');
    const onOpenChange = setup();
    await userEvent.click(screen.getByRole('radio', { name: 'Problem' }));
    await userEvent.type(screen.getByRole('textbox', { name: /Your message/ }), 'The grid freezes');
    await userEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(send).toHaveBeenCalledWith('problem', 'The grid freezes', expect.objectContaining({ page: expect.any(String), appVersion: appVersion() }));
  });

  it('leaves the details out when the box is unticked', async () => {
    const send = vi.spyOn(feedback, 'sendFeedback').mockResolvedValue('sent');
    setup();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Include page and browser details' }));
    await userEvent.type(screen.getByRole('textbox', { name: /Your message/ }), 'Idea');
    await userEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
    await waitFor(() => expect(send).toHaveBeenCalled());
    expect(send.mock.calls[0][2]).toBeNull();
  });

  it('falls back to the mail client while the endpoint does not exist and says so', async () => {
    vi.spyOn(feedback, 'sendFeedback').mockResolvedValue('unavailable');
    const open = vi.spyOn(diagnostics, 'openMail').mockImplementation(() => undefined);
    setup();
    await userEvent.type(screen.getByRole('textbox', { name: /Your message/ }), 'Idea');
    await userEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
    await waitFor(() => expect(open).toHaveBeenCalledWith(expect.stringContaining(`mailto:${SUPPORT_EMAIL}`)));
    expect(screen.getByRole('status')).toHaveTextContent('Feedback is sent by email for now');
  });

  it('shows a retryable error when the endpoint exists but the request fails', async () => {
    vi.spyOn(feedback, 'sendFeedback').mockResolvedValue('failed');
    setup();
    await userEvent.type(screen.getByRole('textbox', { name: /Your message/ }), 'Idea');
    await userEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t send your feedback');
    expect(screen.getByRole('button', { name: 'Send feedback' })).toBeEnabled();
  });
});

describe('sendFeedback', () => {
  beforeEach(() => {
    feedback.resetFeedbackProbe();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('does not call the API until VITE_FEEDBACK_API is true', async () => {
    const f = vi.spyOn(globalThis, 'fetch');
    expect(await feedback.sendFeedback('idea', 'hi', null)).toBe('unavailable');
    expect(f).not.toHaveBeenCalled();
  });

  it('maps the response: 2xx sent, 404 unavailable (remembered), other failures failed', async () => {
    vi.stubEnv('VITE_FEEDBACK_API', 'true');
    const f = vi.spyOn(globalThis, 'fetch');
    f.mockResolvedValueOnce(new Response('{}', { status: 200 }));
    expect(await feedback.sendFeedback('idea', 'hi', null)).toBe('sent');
    f.mockResolvedValueOnce(new Response('{}', { status: 500 }));
    expect(await feedback.sendFeedback('idea', 'hi', null)).toBe('failed');
    f.mockRejectedValueOnce(new TypeError('network'));
    expect(await feedback.sendFeedback('idea', 'hi', null)).toBe('failed');
    f.mockResolvedValueOnce(new Response('{}', { status: 404 }));
    expect(await feedback.sendFeedback('idea', 'hi', null)).toBe('unavailable');
    const calls = f.mock.calls.length;
    expect(await feedback.sendFeedback('idea', 'hi', null)).toBe('unavailable');
    expect(f.mock.calls.length).toBe(calls);
  });
});

describe('What’s new', () => {
  beforeEach(() => localStorage.clear());
  const entry = (n: number) => ({ id: `v${n}`, date: `2026-11-0${n}`, version: String(n), title: `Entry ${n}`, changes: [{ type: 'feature' as const, text: `Line ${n}` }] });

  it('is unseen until the newest entry id is stored', () => {
    expect(hasUnseenEntries([entry(2)], null)).toBe(true);
    expect(hasUnseenEntries([entry(2)], 'v2')).toBe(false);
    expect(hasUnseenEntries([], null)).toBe(false);
  });

  it('useWhatsNew stores the newest id when marked seen', () => {
    let api: ReturnType<typeof useWhatsNew> | undefined;
    function Probe() {
      api = useWhatsNew();
      return null;
    }
    render(<Probe />);
    expect(api!.unseen).toBe(true);
    act(() => api!.markSeen());
    expect(api!.unseen).toBe(false);
    expect(localStorage.getItem('tq.whatsnew.seen')).toBeTruthy();
  });

  it('lists the three newest entries with date and one line, and links to all of them', () => {
    render(
      <WhatsNewPopover open onOpenChange={() => undefined} entries={[1, 2, 3, 4].map(entry)}>
        <button type="button">?</button>
      </WhatsNewPopover>,
    );
    expect(screen.getByText('Entry 1')).toBeInTheDocument();
    expect(screen.getByText('Line 3')).toBeInTheDocument();
    expect(screen.queryByText('Entry 4')).toBeNull();
    expect(screen.getByRole('link', { name: /All changes/ })).toHaveAttribute('href', '/changelog');
  });
});
