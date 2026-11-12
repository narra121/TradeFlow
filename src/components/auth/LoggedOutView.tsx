import { Link } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { AuthFrame } from '@/components/auth/AuthFrame';
import { StatusView } from '@/components/auth/StatusView';

/** What the user sees after `Log out` or `Log out of all devices` (DESIGN-AUTH §3.9). The email is deliberately not shown. */
export function LoggedOutView({ everywhere }: { everywhere: boolean }) {
  return (
    <AuthFrame scene="closed" stage={{ everywhere }}>
      <SEO title="Logged out – TradeQut" description="You are logged out of TradeQut." path="/login" noindex />
      <StatusView
        icon="ok"
        live
        title={everywhere ? "You're logged out on all devices" : "You're logged out"}
        lead={
          everywhere
            ? 'This browser is logged out now. Your other devices are asked to log in again the next time their session renews.'
            : 'This browser no longer has access to your journal. The trade data it had cached here was removed.'
        }
        actions={
          <>
            <Link to="/login" replace className="btn btn-primary btn-block">
              Log in again
            </Link>
            <Link to="/" className="link center link-touch">
              Go to tradequt.com
            </Link>
          </>
        }
        footnote={
          everywhere ? (
            <p>
              Think someone else knows your password?{' '}
              <Link to="/login?view=forgot" className="link">
                Reset it now
              </Link>
            </p>
          ) : (
            <p>On a shared computer, close this window as well.</p>
          )
        }
      />
    </AuthFrame>
  );
}
