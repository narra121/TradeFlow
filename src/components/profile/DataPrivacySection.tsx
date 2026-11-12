import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useProfile } from '@/hooks/useProfile';
import { openConsentSettings } from '@/lib/analytics/consent';
import { DeleteAccountDialog } from './DeleteAccountDialog';
import { SectionHeading, SettingRow } from './layout';
import { useDataExport } from './useDataExport';

export function DataPrivacySection() {
  const { email, isLoading, isError, refetch } = useProfile();
  const exporter = useDataExport();
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isLoading) return <Skeleton className="h-64" aria-label="Loading data and privacy" />;
  if (isError) return <ErrorState title="Couldn't load your data and privacy settings" description="Check your connection and try again." onRetry={refetch} />;

  const { state } = exporter;

  return (
    <section aria-labelledby="data-heading">
      <SectionHeading id="data-heading" title="Data & privacy" />

      <SettingRow label="Export" helper="Everything in your journal as one JSON file: accounts, trades, goals, rules and options.">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {state.status === 'preparing' ? (
            <div className="flex items-center gap-3" role="status">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
              <span className="text-sm">Preparing your export…</span>
              <Button type="button" variant="ghost" size="sm" onClick={exporter.cancel}>Cancel</Button>
            </div>
          ) : state.status === 'ready' ? (
            <a
              href={state.url}
              download={state.fileName}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border-strong px-3 text-13 text-foreground hover:bg-secondary"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download export ({state.size})
            </a>
          ) : (
            <Button type="button" variant="outline" onClick={exporter.start}>Export my data</Button>
          )}
          <Link to="/app/tradelog" className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
            Trades only as CSV: Trades › Export
          </Link>
        </div>
        {state.status === 'error' && (
          <p role="alert" className="text-sm text-error">
            {state.message}{' '}
            <button type="button" className="underline underline-offset-2" onClick={exporter.start}>Retry</button>
          </p>
        )}
      </SettingRow>

      <SettingRow label="AI and your data">
        <p className="max-w-prose pt-1.5 text-sm text-foreground-soft">
          AI features send trade figures — never notes, screenshots, names or email — to Google Gemini, only when you use them.
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-sm">
          <Link to="/privacy" className="text-primary underline underline-offset-2">Privacy policy</Link>
          <button type="button" className="text-primary underline underline-offset-2" onClick={() => openConsentSettings()}>Cookie settings</button>
        </div>
      </SettingRow>

      <div className="mt-6 rounded-lg border border-destructive/40 p-4">
        <h3 className="text-sm font-semibold text-error">Danger zone</h3>
        <p className="mt-1 text-sm text-muted-foreground">Delete account removes your account, journal and billing profile. This cannot be undone.</p>
        <Button type="button" variant="outline" className="mt-3 border-destructive/60 text-error" onClick={() => setDeleteOpen(true)}>
          Delete account…
        </Button>
      </div>

      <DeleteAccountDialog open={deleteOpen} email={email} onOpenChange={setDeleteOpen} exportState={state} onExport={exporter.start} />
    </section>
  );
}
