import { Link } from 'react-router-dom';
import { openConsentSettings } from '@/lib/analytics';
import { FOOTER_GROUPS } from './nav';

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <nav aria-label="Footer" className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {FOOTER_GROUPS.map((g) => (
            <div key={g.title}>
              <h2 className="mb-3 text-sm font-semibold text-foreground">{g.title}</h2>
              <ul className="space-y-1">
                {g.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="inline-flex min-h-6 items-center text-sm text-foreground-soft hover:text-foreground">
                      {l.label}
                    </Link>
                  </li>
                ))}
                {g.title === 'Legal' && (
                  <li>
                    <button
                      type="button"
                      onClick={openConsentSettings}
                      className="inline-flex min-h-6 items-center text-sm text-foreground-soft hover:text-foreground"
                    >
                      Cookie settings
                    </button>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </nav>
        <p className="mt-8 border-t border-border pt-6 text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} TradeQut. TradeQut is a journaling and analytics tool, not investment advice.
        </p>
      </div>
    </footer>
  );
}
