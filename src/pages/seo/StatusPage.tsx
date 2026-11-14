import { useEffect, useState } from 'react';
import { ContentPageShell } from '@/components/content/ContentPageShell';
import { seoPageSchema } from '@/config/seo';
import { STATUS_URL, incidentVisible, parseIncident, type Incident, type IncidentLevel } from '@/lib/incident';
import { cn } from '@/lib/utils';

const PAGE = { path: '/status', title: 'Service status - TradeQut', description: 'Current status of the TradeQut service.', label: 'Status' };

const NORMAL_LABEL = 'All systems normal';

const LEVEL_LABEL: Record<IncidentLevel, string> = {
  investigating: 'Investigating an issue',
  identified: 'Issue identified',
  monitoring: 'Fix applied, monitoring',
  resolved: 'Resolved',
  maintenance: 'Scheduled maintenance',
};

type State = { kind: 'loading' } | { kind: 'ready'; notice: Incident | null } | { kind: 'unavailable' };

const TONE: Record<IncidentLevel, string> = {
  investigating: 'bg-loss/10 text-loss',
  identified: 'bg-warning/10 text-warning',
  monitoring: 'bg-warning/10 text-warning',
  resolved: 'bg-info/10 text-info',
  maintenance: 'bg-info/10 text-info',
};

export default function StatusPage() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    // The prerender (scripts/prerender-routes.js) must not bake today's status into the static page.
    if ((window as { __PRERENDER__?: boolean }).__PRERENDER__) return;
    let cancelled = false;
    fetch(STATUS_URL, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((raw: unknown) => {
        if (cancelled) return;
        const notice = parseIncident(raw);
        setState({ kind: 'ready', notice: incidentVisible(notice, new Date(), new Set()) ? notice : null });
      })
      .catch(() => !cancelled && setState({ kind: 'unavailable' }));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ContentPageShell title={PAGE.title} description={PAGE.description} path={PAGE.path} jsonLd={seoPageSchema(PAGE)} noindex>
      <h1 className="mb-4 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">Service status</h1>
      <div role="status" aria-live="polite">
        {state.kind === 'loading' && <p className="text-muted-foreground">Checking status...</p>}
        {state.kind === 'unavailable' && (
          <p className="text-foreground-soft">
            We could not load the status file. If TradeQut is not working, email{' '}
            <a href="mailto:support@tradequt.com" className="text-primary underline underline-offset-4">
              support@tradequt.com
            </a>
            .
          </p>
        )}
        {state.kind === 'ready' && !state.notice && (
          <p className="inline-flex h-8 items-center rounded bg-profit/10 px-3 text-sm font-medium text-profit">{NORMAL_LABEL}</p>
        )}
        {state.kind === 'ready' && state.notice && (
          <div className="panel p-4">
            <p className={cn('inline-flex h-8 items-center rounded px-3 text-sm font-medium', TONE[state.notice.level])}>
              {LEVEL_LABEL[state.notice.level]}
            </p>
            <p className="mt-3 text-foreground">{state.notice.message}</p>
            {state.notice.from && (
              <p className="mt-2 text-sm text-muted-foreground">
                Since <time dateTime={state.notice.from}>{new Date(state.notice.from).toLocaleString('en-US')}</time>
                {state.notice.until && (
                  <>
                    {' '}
                    until <time dateTime={state.notice.until}>{new Date(state.notice.until).toLocaleString('en-US')}</time>
                  </>
                )}
              </p>
            )}
            {state.notice.link && (
              <a href={state.notice.link} className="mt-2 inline-flex min-h-6 max-md:min-h-11 items-center text-sm text-primary hover:underline">
                More detail
              </a>
            )}
          </div>
        )}
      </div>
    </ContentPageShell>
  );
}
