import { Link, useLocation } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { PublicLayout } from '@/components/public/PublicLayout';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/guide', label: 'Guide' },
  { to: '/blog', label: 'Blog' },
  { to: '/login', label: 'Log in', className: 'signed-out-only' },
];

const NotFound = () => {
  const location = useLocation();

  return (
    <>
      <SEO title="Page not found - TradeQut" description="The page you are looking for does not exist." path={location.pathname} noindex />
      <PublicLayout>
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <p className="num text-sm text-muted-foreground">404</p>
          <h1 className="mt-1 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">Page not found</h1>
          <p className="mt-3 text-base text-foreground-soft">The page may have moved, or the link is wrong.</p>
          <ul className="mt-6 flex flex-wrap gap-3">
            {LINKS.map((l) => (
              <li key={l.to} className={l.className}>
                <Link
                  to={l.to}
                  className="inline-flex h-10 items-center rounded-md border border-border-strong px-4 text-sm font-medium text-foreground hover:bg-secondary"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </PublicLayout>
    </>
  );
};

export default NotFound;
