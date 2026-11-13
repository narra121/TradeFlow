import { Component, useEffect } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { Loader2 } from 'lucide-react';

// Error boundary that catches chunk load failures after a new deploy
// and auto-reloads the page once to fetch the updated index.html.
const RELOAD_KEY = 'chunk-reload';

function isChunkError(error: Error): boolean {
  return (
    error.name === 'ChunkLoadError' ||
    error.message.includes('Failed to fetch dynamically imported module') ||
    error.message.includes('Loading chunk') ||
    error.message.includes('Loading CSS chunk')
  );
}

export class ChunkErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; isChunk: boolean }> {
  state = { hasError: false, isChunk: false };

  static getDerivedStateFromError(error: Error) {
    if (isChunkError(error)) {
      // Only auto-reload once to avoid infinite loops
      const alreadyReloaded = sessionStorage.getItem(RELOAD_KEY);
      if (!alreadyReloaded) {
        sessionStorage.setItem(RELOAD_KEY, '1');
        // Cache-busting reload: append timestamp to force fresh fetch
        const url = new URL(window.location.href);
        url.searchParams.set('_cb', Date.now().toString());
        window.location.replace(url.toString());
        return { hasError: true, isChunk: true };
      }
      return { hasError: true, isChunk: true };
    }
    // Non-chunk errors: catch to prevent white screen, but show generic error
    return { hasError: true, isChunk: false };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ChunkErrorBoundary caught:', error, info);
    import('@/lib/errorReporter').then(({ reportReactError }) => {
      reportReactError(error, info);
    }).catch(() => {});
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
          <p className="text-muted-foreground">
            {this.state.isChunk ? 'A new version is available.' : 'An unexpected error occurred. Error logs have been sent \u2014 we\u2019ll provide a fix soon.'}
          </p>
          <button
            className="glow-primary px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => {
              sessionStorage.removeItem(RELOAD_KEY);
              const url = new URL(window.location.href);
              url.searchParams.set('_cb', Date.now().toString());
              window.location.replace(url.toString());
            }}
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Mounted inside <Suspense>: its effect runs only after the matched route chunk has loaded, so a chunk that keeps failing reloads once, not forever.
export function ReloadGuardReset() {
  useEffect(() => {
    sessionStorage.removeItem(RELOAD_KEY);
  }, []);
  return null;
}

export function PageLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

// Strip the cache-buster param from the URL bar without reloading
if (window.location.search.includes('_cb=')) {
  const url = new URL(window.location.href);
  url.searchParams.delete('_cb');
  window.history.replaceState(null, '', url.pathname + url.search + url.hash);
}
