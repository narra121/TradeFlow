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

import { AuthNotice } from '../AuthNotice';
import { FactsList } from '../FactsList';
import { LoggedOutView } from '../LoggedOutView';
import { ProductPane } from '../ProductPane';
import { StatusView } from '../StatusView';
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
  });

  it('is announced as a status, carries the sample dashboard and is noindex', async () => {
    const { container } = render(shell(<LoggedOutView everywhere={false} />));
    expect(container.querySelector('[role=status]')).toHaveTextContent("You're logged out");
    expect(screen.getByRole('complementary', { name: 'What TradeQut looks like' })).toBeInTheDocument();
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

describe('FactsList and ProductPane', () => {
  it('lists the import brokers from IMPORT_SOURCES and the trial terms', () => {
    render(<FactsList />);
    expect(screen.getByText('Zerodha, Dhan, Upstox, Angel One, Groww, MT4 and MT5 files, or any CSV.')).toBeInTheDocument();
    expect(screen.getByText('You stay on Free unless you upgrade. No card on file, so nothing to cancel.')).toBeInTheDocument();
    expect(screen.getAllByRole('term')).toHaveLength(4);
  });

  it('puts the picture in one labelled image and exposes nothing focusable inside the pane', () => {
    const { container } = render(<ProductPane variant="journal" />);
    expect(screen.getByRole('img', { name: /Sample data, not your account/ })).toBeInTheDocument();
    expect(screen.getByText('November 2026 on the dashboard')).toBeInTheDocument();
    expect(container.querySelector('a, button, input, [tabindex]')).toBeNull();
    expect(container.querySelector('h2')).toBeNull();
    expect(screen.getAllByText('+$370.50').length).toBeGreaterThan(0);
    expect(screen.getAllByText('−$118.25').length).toBeGreaterThan(0);
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
