import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SEO } from '@/components/SEO';
import { Zap, ArrowLeft } from 'lucide-react';

interface ContentPageShellProps {
  title: string;
  description: string;
  path: string;
  jsonLd: object;
  navLabel: string;
  maxWidth?: string;
  children: React.ReactNode;
}

export function ContentPageShell({
  title,
  description,
  path,
  jsonLd,
  navLabel,
  maxWidth = 'max-w-4xl',
  children,
}: ContentPageShellProps) {
  return (
    <>
      <SEO title={title} description={description} path={path} jsonLd={jsonLd} />
      <div className="min-h-screen bg-background">
        <nav aria-label={navLabel} className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">TradeQut</span>
            </Link>
            <Button variant="ghost" asChild className="gap-2">
              <Link to="/">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Home</span>
                <span className="sm:hidden">Back</span>
              </Link>
            </Button>
          </div>
        </nav>

        <main id="main-content">
          <article>
            <div className="pt-28 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6">
              <div className={`${maxWidth} mx-auto`}>
                {children}
              </div>
            </div>
          </article>
        </main>

        <footer className="border-t border-border/50 bg-card/50 py-8 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} TradeQut. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:gap-x-6 text-sm">
              <Link to="/blog" className="text-muted-foreground hover:text-foreground transition-colors">Blog</Link>
              <Link to="/glossary" className="text-muted-foreground hover:text-foreground transition-colors">Glossary</Link>
              <Link to="/resources" className="text-muted-foreground hover:text-foreground transition-colors">Resources</Link>
              <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">About</Link>
              <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
              <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
              <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
