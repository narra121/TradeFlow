import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandMark } from './BrandMark';
import { HEADER_LINKS, RESOURCE_LINKS, type NavLink } from './nav';

const linkClass = 'inline-flex h-9 items-center rounded-md px-3 text-sm text-foreground-soft hover:bg-secondary hover:text-foreground';

// signed-out-only / signed-in-only: shown by session state, CSS in index.html.
const MENU_LINKS: (NavLink & { className?: string })[] = [
  ...HEADER_LINKS,
  ...RESOURCE_LINKS,
  { to: '/login', label: 'Log in', className: 'signed-out-only' },
  { to: '/app/dashboard', label: 'Dashboard', className: 'signed-in-only' },
];

/** Disclosure (not an ARIA menu): a button that shows a list of ordinary links. */
function ResourcesMenu() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const { pathname, hash } = useLocation();

  useEffect(() => setOpen(false), [pathname, hash]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onClick = (e: MouseEvent) => root.current && !root.current.contains(e.target as Node) && setOpen(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button type="button" aria-expanded={open} aria-controls="resources-list" onClick={() => setOpen((v) => !v)} className={`${linkClass} gap-1`}>
        Resources
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </button>
      {open && (
        <ul id="resources-list" data-side="bottom" className="popup-motion absolute left-0 top-full z-50 mt-1 w-48 rounded-lg border border-border bg-popover p-1 shadow-overlay">
          {RESOURCE_LINKS.map((l) => (
            <li key={l.to}>
              <Link to={l.to} className="flex h-9 items-center rounded-md px-3 text-sm text-foreground -outline-offset-2 hover:bg-secondary [@media(pointer:coarse)]:h-11">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const { pathname, hash } = useLocation();

  useEffect(() => setOpen(false), [pathname, hash]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="text-foreground" aria-label="TradeQut home">
          <BrandMark />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {HEADER_LINKS.map((l) => (
            <Link key={l.label} to={l.to} className={linkClass}>
              {l.label}
            </Link>
          ))}
          <ResourcesMenu />
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild className="signed-out-only hidden md:inline-flex">
            <Link to="/login">Log in</Link>
          </Button>
          <Button variant="outline" asChild className="signed-out-only">
            <Link to="/signup">Start free</Link>
          </Button>
          <Button variant="outline" asChild className="signed-in-only">
            <Link to="/app/dashboard">Dashboard</Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-expanded={open}
            aria-controls="public-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </Button>
        </div>
      </div>

      {open && (
        <nav id="public-menu" aria-label="Menu" className="fixed inset-x-0 bottom-0 top-14 z-40 overflow-y-auto bg-background p-4 md:hidden">
          <ul className="space-y-1">
            {MENU_LINKS.map((l) => (
              <li key={l.label} className={l.className}>
                <Link to={l.to} className="flex h-12 items-center rounded-md px-3 text-base text-foreground hover:bg-secondary">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
