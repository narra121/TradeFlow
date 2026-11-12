import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Info, TriangleAlert, X } from 'lucide-react';
import { incidentVisible, parseIncident, STATUS_URL, type Incident, type IncidentLevel } from '@/lib/incident';
import { cn } from '@/lib/utils';

const DISMISS_KEY = 'tq.incident.dismissed';
const REFRESH_MS = 5 * 60 * 1000;

const TONE: Record<IncidentLevel, { icon: typeof Info; text: string }> = {
  investigating: { icon: AlertCircle, text: 'text-error' },
  identified: { icon: AlertCircle, text: 'text-error' },
  monitoring: { icon: TriangleAlert, text: 'text-warning' },
  maintenance: { icon: TriangleAlert, text: 'text-warning' },
  resolved: { icon: Info, text: 'text-info' },
};

function readDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISS_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

/** Reads `/status.json` on load, on window focus and every 5 minutes; a failed read keeps what was shown. */
function useIncident(): Incident | null {
  const [incident, setIncident] = useState<Incident | null>(null);
  const load = useCallback(async () => {
    try {
      const res = await fetch(STATUS_URL, { cache: 'no-store' });
      if (res.ok) setIncident(parseIncident(await res.json()));
    } catch {
      // offline or file missing: keep the last state
    }
  }, []);
  useEffect(() => {
    void load();
    const timer = window.setInterval(load, REFRESH_MS);
    window.addEventListener('focus', load);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', load);
    };
  }, [load]);
  return incident;
}

export function IncidentBar() {
  const incident = useIncident();
  const [dismissed, setDismissed] = useState<Set<string>>(readDismissed);
  if (!incident || !incidentVisible(incident, new Date(), dismissed)) return null;

  const { icon: Icon, text } = TONE[incident.level];
  const dismiss = () => {
    const next = new Set(dismissed).add(incident.id);
    setDismissed(next);
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify([...next]));
    } catch {
      // not persisted
    }
  };

  return (
    <div role="status" className="flex h-9 shrink-0 items-center gap-2 border-b border-border bg-card px-3 text-13 md:px-6">
      <Icon className={cn('h-4 w-4 shrink-0', text)} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{incident.message}</span>
      {incident.link && (
        <a href={incident.link} target="_blank" rel="noopener noreferrer" className="shrink-0 font-medium text-primary hover:underline">
          Details
        </a>
      )}
      <button type="button" aria-label="Dismiss incident notice" className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground" onClick={dismiss}>
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
