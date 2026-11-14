import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { HelmetProvider } from 'react-helmet-async';
import { store } from '@/store';
import { LoginPage } from '@/pages/LoginPage';

const { logout } = vi.hoisted(() => ({ logout: vi.fn() }));
vi.mock('@/store/api', async (orig) => ({
  ...(await orig<object>()),
  useLogoutMutation: () => [() => ({ unwrap: () => logout() }), { isLoading: false }],
}));

import { AuthFrame } from '../AuthFrame';
import { AuthNotice } from '../AuthNotice';
import { LoggedOutView } from '../LoggedOutView';
import { SCENES } from '../scenes';
import { StageBar } from '../StageBar';
import { StatusView } from '../StatusView';
import { StepRow } from '../StepRow';
import { StageVisual } from '../visual/StageVisual';
import { LOGGED_OUT_URL, useLogout } from '../useLogout';
import { RequireAuth } from '../RequireAuth';
import { setLoggingOut } from '../loggingOut';

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const shell = (ui: React.ReactElement, entry = '/') => (
  <HelmetProvider>
    <Provider store={store}>
      <MemoryRouter initialEntries={[entry]}>{ui}</MemoryRouter>
    </Provider>
  </HelmetProvider>
);

describe('LoggedOutView (DESIGN-AUTH §3.9)', () => {
  it('confirms the log out, says what was removed, and offers Log in again and the site', () => {
    render(shell(<LoggedOutView everywhere={false} />));
    const h1 = screen.getByRole('heading', { level: 1, name: "You're logged out" });
    expect(h1).toHaveFocus();
    expect(screen.getByText('This browser no longer has access to your journal. The trade data it had cached here was removed.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Log in again' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Go to tradequt.com' })).toHaveAttribute('href', '/');
    expect(screen.getByText('On a shared computer, close this window as well.')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/@/);
  });

  it('the all-devices variant names every device and offers a reset', () => {
    render(shell(<LoggedOutView everywhere />));
    expect(screen.getByRole('heading', { level: 1, name: "You're logged out on all devices" })).toBeInTheDocument();
    expect(screen.getByText(/Your other devices are asked to log in again the next time their session renews\./)).toBeInTheDocument();
    expect(screen.queryByText(/within an hour/)).toBeNull();
    expect(screen.getByRole('link', { name: 'Reset it now' })).toHaveAttribute('href', '/login?view=forgot');
    expect(within(screen.getByRole('complementary')).getByText('Other devices')).toBeInTheDocument();
  });

  it('is announced as a status, sets the closed stage with what log out removed, and is noindex', async () => {
    const { container } = render(shell(<LoggedOutView everywhere={false} />));
    expect(container.querySelector('[role=status]')).toHaveTextContent("You're logged out");
    const stage = screen.getByRole('complementary', { name: 'About this step' });
    expect(stage.querySelector('.auth-display')).toHaveTextContent('Your journal is closed on this browser.');
    expect(within(stage).getAllByRole('term').map((t) => t.textContent)).toEqual(['Session on this browser', 'Cached trades and images', 'Unsaved trade drafts']);
    expect(within(stage).queryByText('Sample data')).toBeNull();
    await waitFor(() => expect(document.title).toBe('Logged out – TradeQut'));
    expect(document.querySelector('meta[name=robots]')).toHaveAttribute('content', 'noindex, nofollow');
  });
});

describe('LoginPage routes to the signed-out view', () => {
  it.each([
    ['/login?view=logged-out', "You're logged out"],
    ['/login?view=logged-out&scope=all', "You're logged out on all devices"],
    ['/login?reason=logged-out-everywhere', "You're logged out on all devices"],
  ])('%s', (entry, title) => {
    render(shell(<LoginPage />, entry));
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
  });

  it('a plain /login is the log-in form with Log in – TradeQut as the page title', async () => {
    render(shell(<LoginPage />, '/login'));
    expect(screen.getByRole('heading', { level: 1, name: 'Log in to TradeQut' })).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('Log in – TradeQut'));
  });
});

describe('StatusView', () => {
  it('moves focus to the h1, can be a live region, and keeps the icon out of the reading order', () => {
    const { container } = render(<StatusView icon="failed" live title="Couldn't finish" lead="Lead" actions={<button type="button">Act</button>} footnote={<p>Foot</p>} />);
    expect(screen.getByRole('heading', { level: 1, name: "Couldn't finish" })).toHaveFocus();
    expect(container.querySelector('[role=status]')).toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('button', { name: 'Act' })).toBeInTheDocument();
    expect(screen.getByText('Foot')).toBeInTheDocument();
  });
});

describe('AuthNotice', () => {
  it('renders a title and body in each tone', () => {
    const { container, rerender } = render(<AuthNotice tone="success" title="Password changed">Log in with your new password.</AuthNotice>);
    expect(container.querySelector('.notice.success')).toHaveTextContent('Password changed');
    rerender(<AuthNotice tone="warning" title="You're offline">Reconnect.</AuthNotice>);
    expect(container.querySelector('.notice.warning')).toBeInTheDocument();
    rerender(<AuthNotice tone="info">Plain</AuthNotice>);
    expect(container.querySelector('.notice')).not.toHaveClass('success');
  });
});

describe('AuthFrame (DESIGN-AUTH-V2 §2)', () => {
  it('keeps the document order header, form, stage, legal, with one copy of the head in the header and one in the stage', () => {
    const { container } = render(shell(<AuthFrame alternate={{ prompt: 'New here?', note: 'Trial', label: 'Create account', to: '/signup' }}><h1>Log in</h1></AuthFrame>));
    const order = [...container.querySelectorAll('.tq-auth > header, .tq-auth > main, .tq-auth > aside, .tq-auth > footer')].map((e) => e.tagName);
    expect(order).toEqual(['HEADER', 'MAIN', 'ASIDE', 'FOOTER']);
    expect(within(screen.getByRole('banner')).getByText('Welcome back')).toBeInTheDocument();
    expect(within(screen.getByRole('complementary')).getByText('Welcome back')).toBeInTheDocument();
    expect(container.querySelector('header .auth-head')).toHaveClass('is-top');
    expect(container.querySelector('aside .auth-head')).toHaveClass('is-stage');
    // Tab order: logo, the form, the other way in, the pause control, the legal links.
    const stops = [...container.querySelectorAll('a, button')].map((e) => e.getAttribute('aria-label') ?? e.textContent);
    expect(stops).toEqual(['TradeQut home', 'Create account', 'Pause animations', 'Privacy', 'Terms', 'Security', 'Status']);
  });

  it('pauses and resumes every animation from one control', async () => {
    render(shell(<AuthFrame><h1>Log in</h1></AuthFrame>));
    const pause = screen.getByRole('button', { name: 'Pause animations' });
    expect(pause).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(pause);
    expect(screen.getByRole('button', { name: 'Play animations' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('without a stage is one card: no aside, no pause control, no sample data', () => {
    const { container } = render(shell(<AuthFrame pane="none"><h1>Gone</h1></AuthFrame>));
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(container.querySelector('.tq-auth')).toHaveAttribute('data-scene', 'none');
    expect(container.textContent).not.toContain('Sample data');
  });

  it('does not load the demos or the field before the frame has been on screen', () => {
    const { container } = render(shell(<AuthFrame><h1>Log in</h1></AuthFrame>));
    expect(container.querySelector('canvas')).toBeNull();
    expect(container.querySelector('.stage-box')).toBeEmptyDOMElement();
  });

  it('mounts the live demo once the frame is on screen, with no canvas behind the form (DESIGN-SHARED S6.2)', async () => {
    class Seen {
      constructor(private cb: IntersectionObserverCallback) {}
      observe(el: Element) {
        queueMicrotask(() => this.cb([{ isIntersecting: true, target: el } as IntersectionObserverEntry], this as unknown as IntersectionObserver));
      }
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    vi.stubGlobal('IntersectionObserver', Seen);
    try {
      const { container } = render(shell(<AuthFrame><h1>Log in</h1></AuthFrame>));
      expect(await screen.findByRole('img', { name: /Sample data: the TradeQut calendar for November 2026/ }, { timeout: 15_000 })).toBeInTheDocument();
      expect(container.querySelector('canvas')).toBeNull();
      // The picture is one labelled image; nothing inside it takes focus.
      expect(container.querySelector('.stage-box a, .stage-box button, .stage-box input, .stage-box [tabindex]')).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  }, 20_000);
});

describe('StageBar, StepRow and the stage cards', () => {
  it('prints the sample month from the one fixture and labels it Sample data', () => {
    render(<StageBar meta={SCENES.journal} paused={false} onToggle={() => {}} />);
    expect(screen.getByText('Sample data')).toBeInTheDocument();
    expect(screen.getAllByRole('term').map((t) => t.textContent)).toEqual(['Net P&L', 'Win rate', 'Best day']);
    expect(screen.getByText('+$370.50')).toBeInTheDocument();
    expect(screen.getByText('29 trades · 11 days')).toBeInTheDocument();
    expect(screen.getByText('17 W · 12 L')).toBeInTheDocument();
    expect(screen.getByText('+$140.00')).toBeInTheDocument();
  });

  it('a scene without a picture has a sentence, no chip and no cells', () => {
    render(<StageBar meta={SCENES.reset} paused={false} onToggle={() => {}} />);
    expect(screen.getByText('Nothing in your journal changes when you reset your password.')).toBeInTheDocument();
    expect(screen.queryByText('Sample data')).toBeNull();
    expect(screen.queryByRole('term')).toBeNull();
  });

  it('marks the current sign-up step and the ones done', () => {
    render(<StepRow current={2} />);
    const items = screen.getAllByRole('listitem');
    expect(items.map((li) => li.getAttribute('aria-current'))).toEqual([null, 'step', null]);
    expect(items[0]).toHaveTextContent('Create account (done)');
    expect(items[2]).toHaveTextContent('03First run');
  });

  it('reset shows the three steps and the one thing a reset changes', () => {
    render(<StageVisual scene="reset" data={{ resetStep: 2 }} paused={false} seen={false} />);
    const steps = within(screen.getByRole('list', { name: 'Password reset steps' })).getAllByRole('listitem');
    expect(steps.map((li) => li.getAttribute('aria-current'))).toEqual([null, 'step', null]);
    expect(screen.getByText('Password').nextElementSibling).toHaveTextContent('New');
    for (const kept of ['Trades, notes and screenshots', 'Goals and rules', 'Plan and billing']) {
      expect(screen.getByText(kept).nextElementSibling).toHaveTextContent('Unchanged');
    }
  });

  it('the mail card names the address, shows how many digits are in, and turns to accepted', () => {
    const { container, rerender } = render(<StageVisual scene="mail" data={{ email: 'ann@example.com', codeLength: 2 }} paused={false} seen={false} />);
    expect(screen.getByRole('img', { name: 'A message with a 6-digit code for ann@example.com.' })).toBeInTheDocument();
    expect(container.querySelectorAll('.mail__code i[data-on]')).toHaveLength(2);
    rerender(<StageVisual scene="mail" data={{ email: 'ann@example.com', codeLength: 6, verified: true }} paused={false} seen={false} />);
    expect(container.querySelector('.mail__code')).toHaveAttribute('data-done');
    expect(container).toHaveTextContent('Code accepted.');
  });

  it('the Google wait shows what is happening without a product picture', () => {
    render(<StageVisual scene="opening" data={{}} paused={false} seen={false} />);
    expect(screen.getByText('Checking your Google account')).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
  });
});

describe('useLogout', () => {
  function Where() {
    return <p data-testid="where">{useLocation().pathname + useLocation().search}</p>;
  }
  function Host() {
    const { requestLogout, dialog } = useLogout();
    return (
      <>
        <button type="button" onClick={requestLogout}>
          Log out
        </button>
        {dialog}
      </>
    );
  }
  const mount = () =>
    render(
      shell(
        <Routes>
          <Route path="*" element={<><Host /><Where /></>} />
        </Routes>,
      ),
    );

  beforeEach(() => {
    sessionStorage.clear();
    logout.mockReset();
    logout.mockResolvedValue(undefined);
  });

  it('logs out at once and lands on the signed-out view when there is no draft', async () => {
    mount();
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(LOGGED_OUT_URL));
    expect(logout).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('with an unsaved draft it asks once; Keep editing (default focus) does not log out', async () => {
    sessionStorage.setItem('tq.draft.new', '{"symbol":"EURUSD"}');
    mount();
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Log out and discard your unsaved trade?')).toBeInTheDocument();
    expect(within(dialog).getByText("You have a trade that isn't saved yet. Logging out removes it from this browser.")).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Keep editing' })).toHaveFocus();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep editing' }));
    expect(logout).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('tq.draft.new')).not.toBeNull();
  });

  it('confirming the dialog logs out', async () => {
    sessionStorage.setItem('tq.draft.t1', '{}');
    mount();
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }));
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Log out' }));
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(LOGGED_OUT_URL));
  });
});

describe('RequireAuth during a log out', () => {
  function Where() {
    const l = useLocation();
    return <p data-testid="where">{l.pathname + l.search}</p>;
  }
  const at = () =>
    render(
      shell(
        <Routes>
          <Route path="/app" element={<RequireAuth><div>secret</div></RequireAuth>} />
          <Route path="*" element={<Where />} />
        </Routes>,
        '/app',
      ),
    );

  it('sends a signed-out visitor to /login with the page they asked for', async () => {
    localStorage.removeItem('idToken');
    at();
    expect(await screen.findByTestId('where')).toHaveTextContent('/login');
    expect(screen.getByTestId('where')).not.toHaveTextContent('view=logged-out');
  });

  it('sends a user who just chose Log out straight to the signed-out view', async () => {
    localStorage.removeItem('idToken');
    setLoggingOut(true);
    at();
    setLoggingOut(false);
    expect(await screen.findByTestId('where')).toHaveTextContent('/login?view=logged-out');
  });
});
