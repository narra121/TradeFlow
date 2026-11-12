export type IncidentLevel = 'investigating' | 'identified' | 'monitoring' | 'resolved' | 'maintenance';

export interface Incident {
  id: string;
  level: IncidentLevel;
  message: string;
  link?: string;
  /** ISO timestamps; either may be absent. */
  from?: string;
  until?: string;
}

const LEVELS: readonly string[] = ['investigating', 'identified', 'monitoring', 'resolved', 'maintenance'];

export const STATUS_URL = '/status.json';

/** `{}` (or anything malformed) means nothing to show. */
export function parseIncident(raw: unknown): Incident | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id || typeof r.message !== 'string' || !r.message || typeof r.level !== 'string' || !LEVELS.includes(r.level)) return null;
  const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
  return { id: r.id, level: r.level as IncidentLevel, message: r.message, link: str(r.link), from: str(r.from), until: str(r.until) };
}

/** Inside its `from`/`until` window and not dismissed for this `id`. */
export function incidentVisible(i: Incident | null, now: Date, dismissed: ReadonlySet<string>): boolean {
  if (!i || dismissed.has(i.id)) return false;
  const t = now.getTime();
  if (i.from && t < Date.parse(i.from)) return false;
  if (i.until && t >= Date.parse(i.until)) return false;
  return true;
}
