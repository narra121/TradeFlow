import { Pause, Play } from 'lucide-react';
import type { SceneMeta } from '@/components/auth/scenes';
import { SampleDataChip } from '@/components/showcase/SampleDataChip';
import { dayLabel, money, percent, plural, sampleStats } from '@/components/showcase/sampleJournal';

interface StageBarProps {
  meta: SceneMeta;
  /** Overrides the scene's own cells (verify opened from sign up keeps the facts). */
  bar?: SceneMeta['bar'];
  paused: boolean;
  onToggle: () => void;
}

const MONTH = sampleStats();

/** The sample month's figures, as the dashboard prints them (showcase/DashboardWindow). */
const STATS: { label: string; value: string; hint: string; tone?: 'pos' | 'neg' }[] = [
  { label: 'Net P&L', value: money(MONTH.net), hint: `${plural(MONTH.trades, 'trade')} · ${plural(MONTH.days, 'day')}`, tone: MONTH.net < 0 ? 'neg' : 'pos' },
  { label: 'Win rate', value: percent(MONTH.winRate), hint: `${MONTH.wins} W · ${MONTH.losses} L` },
  { label: 'Best day', value: money(MONTH.bestDay.pnl), hint: dayLabel(MONTH.bestDay.day), tone: 'pos' },
];

/** What an account commits you to: facts the code proves (CONTRACT §4; CLAIMS-EVIDENCE S14). No counts, ratings or security claims. */
const FACTS: [string, string][] = [
  ['Read-only after the trial', 'Unless you upgrade to Pro.'],
  ['Export any time', 'Your trades, from Settings.'],
  ['Delete any time', 'Your account and journal.'],
];

/** The bar that closes the stage: the scene's note, its cells, and the control that stops every animation on the page (WCAG 2.2.2). */
export function StageBar({ meta, bar = meta.bar, paused, onToggle }: StageBarProps) {
  return (
    <div className="stage-bar" data-cells={bar ?? 'none'}>
      <p className="bar-note">
        {meta.sample && <SampleDataChip />}
        {meta.note && <span>{meta.note}</span>}
      </p>
      {bar === 'stats' && (
        <dl className="bar-cells">
          {STATS.map((s) => (
            <div key={s.label}>
              <dt>{s.label}</dt>
              <dd>
                <span className={`tq-num${s.tone ? ` tq-${s.tone}` : ''}`}>{s.value}</span>
                <small>{s.hint}</small>
              </dd>
            </div>
          ))}
        </dl>
      )}
      {bar === 'facts' && (
        <dl className="bar-cells facts">
          {FACTS.map(([title, text]) => (
            <div key={title}>
              <dt>{title}</dt>
              <dd>
                <small>{text}</small>
              </dd>
            </div>
          ))}
        </dl>
      )}
      <button type="button" className="stage-pause" onClick={onToggle} aria-pressed={paused} aria-label={paused ? 'Play animations' : 'Pause animations'}>
        {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
      </button>
    </div>
  );
}
