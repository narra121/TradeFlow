import { useEffect, useMemo, useState } from 'react';
import { ContentPageShell } from '@/components/content/ContentPageShell';
import { calcInputClass, calcLabelClass } from '@/components/content/calculator';
import { A, Callout, Crumbs, Disclaimer, Faq, H2, P, ShortAnswer, SignupCta, Sources, Table } from '@/content/components/ArticleParts';
import type { FaqItem } from '@/content/product-facts';
import { calculatorSchema } from '@/config/seo';
import { browserZone } from '@/components/settings/timeZones';
import {
  SESSIONS,
  clockChanges,
  dayIn,
  hhmm,
  instantAt,
  isMarketOpen,
  londonNewYorkByPeriod,
  offsetAt,
  sessionsNow,
  sessionsOnDay,
  type SessionId,
} from '@/lib/forex/sessions';
import { cn } from '@/lib/utils';

const PATH = '/resources/forex-market-hours';
const NAME = 'Forex market hours and sessions clock';
const TITLE = 'Forex Market Hours and Sessions Clock | TradeQut';
const DESCRIPTION =
  'Sydney, Tokyo, London and New York sessions and their overlaps in your own time zone, with this year\'s daylight-saving changes worked out for you.';

/** Zones listed first in the picker; the browser's own zone is added when it is not here. */
const ZONES = [
  'UTC', 'Europe/London', 'Europe/Berlin', 'Europe/Istanbul', 'Africa/Lagos', 'Africa/Johannesburg', 'Africa/Nairobi', 'Africa/Cairo',
  'Asia/Dubai', 'Asia/Riyadh', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Dhaka', 'Asia/Bangkok', 'Asia/Jakarta', 'Asia/Kuala_Lumpur',
  'Asia/Singapore', 'Asia/Manila', 'Asia/Hong_Kong', 'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland', 'America/New_York',
  'America/Chicago', 'America/Los_Angeles', 'America/Toronto', 'America/Mexico_City', 'America/Sao_Paulo',
];

const COLORS: Record<SessionId, string> = {
  sydney: 'bg-chart-4/70',
  tokyo: 'bg-chart-3/70',
  london: 'bg-chart-1/70',
  newYork: 'bg-chart-2/70',
};

const NAMES = Object.fromEntries(SESSIONS.map((s) => [s.id, s.name])) as Record<SessionId, string>;

const FAQ: FaqItem[] = [
  {
    question: 'What are the forex market hours?',
    answer:
      'Retail forex trades from Sunday 17:00 to Friday 17:00 New York time, 24 hours a day in between. In UTC that is Sunday 22:00 to Friday 22:00 in the northern winter and Sunday 21:00 to Friday 21:00 when New York is on daylight time. Your broker sets its own hours and may pause for a few minutes around the daily rollover.',
  },
  {
    question: 'What are the four forex sessions?',
    answer:
      'Sydney, Tokyo, London and New York. Each follows the local working day of its city: by the convention used here Sydney 07:00-16:00, Tokyo 09:00-18:00, London 08:00-17:00 and New York 08:00-17:00 local time. They are conventions, not exchange hours, so other sites may shift them by an hour.',
  },
  {
    question: 'When do London and New York overlap?',
    answer:
      'From 08:00 to 12:00 New York time for most of the year: 13:00-17:00 UTC in the northern winter and 12:00-16:00 UTC in the summer. In India that is 18:30-22:30 IST in winter and 17:30-21:30 IST in summer. For about three weeks in March and one week around the end of October the US has changed its clocks and the UK has not, and the overlap is five hours (12:00-17:00 UTC).',
  },
  {
    question: 'Why do session times change during the year?',
    answer:
      'London, New York and Sydney use daylight saving time and Tokyo does not. The UK changes on the last Sundays of March and October, the US on the second Sunday of March and the first Sunday of November, and Sydney on the first Sundays of October and April. Seen from a country without daylight saving, such as India, Pakistan or Nigeria, every session except Tokyo moves by an hour twice a year.',
  },
  {
    question: 'Is the forex market open on weekends?',
    answer:
      'No. The retail market closes on Friday at 17:00 New York time and reopens on Sunday at 17:00 New York time, which is Monday morning in Sydney. Prices can open away from Friday\'s close (a weekend gap).',
  },
  {
    question: 'Which session should I trade?',
    answer:
      'This page does not recommend a time to trade. Liquidity is usually highest while two major sessions overlap, but whether your own trades do better in one session is a question your results answer: log the session of each trade and compare them over enough trades.',
  },
  {
    question: 'Does the clock know my time zone?',
    answer:
      'It starts in the time zone your browser reports and you can pick another. Times come from the time-zone database built into your browser, so daylight-saving changes for your zone and for each session city are applied for the date you choose.',
  },
  {
    question: 'Can TradeQut show my results by session?',
    answer:
      'Yes, by tag. You tag each trade\'s session (Asian, London Open, NY Open, London/NY Overlap and so on; several trades at once with bulk edit) and Analytics shows net P&L, win rate and average R by session. It also breaks results down by hour of day and weekday from each trade\'s open time in your time zone. The session tag is not filled in automatically from the trade time.',
  },
];

function fmt(ms: number, zone: string, withDay: boolean): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: zone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      ...(withDay ? { weekday: 'short' } : {}),
    }).format(new Date(ms));
  } catch {
    return '';
  }
}

function offsetText(m: number): string {
  const sign = m < 0 ? '−' : '+';
  const a = Math.abs(m);
  return `UTC${sign}${Math.floor(a / 60)}${a % 60 ? `:${String(a % 60).padStart(2, '0')}` : ''}`;
}

const offsetLabel = (ms: number, zone: string) => offsetText(offsetAt(ms, zone));

const zoneName = (zone: string) => (zone === 'UTC' ? 'UTC' : zone.split('/').pop()!.replace(/_/g, ' '));

function until(ms: number, now: number): string {
  const min = Math.max(0, Math.round((ms - now) / 60_000));
  const h = Math.floor(min / 60);
  const d = Math.floor(h / 24);
  if (d >= 1) return `${d} d ${h % 24} h`;
  return h ? `${h} h ${min % 60} min` : `${min} min`;
}

const longDay = (day: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(`${day}T12:00:00Z`),
  );
const shortDay = (day: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(new Date(`${day}T12:00:00Z`));

function utcRows(day: string): string[][] {
  const { sessions } = sessionsOnDay(day, 'UTC');
  const start = instantAt(day, 0, 'UTC');
  return SESSIONS.map((s) => {
    const own = sessions.filter((x) => x.id === s.id);
    // A session that crosses UTC midnight shows as two pieces; join them as one evening-to-morning range.
    const late = own.find((x) => x.end - start === 86_400_000 && x.start > start);
    const early = own.find((x) => x.start === start && x.end < start + 86_400_000);
    const range = late && early ? `${hhmm((late.start - start) / 60_000)} - ${hhmm((early.end - start) / 60_000)} (next day)` : own.map((x) => `${hhmm((x.start - start) / 60_000)} - ${hhmm((x.end - start) / 60_000)}`).join(', ');
    return [s.name, `${hhmm(s.open)} - ${hhmm(s.close)} ${s.zone.split('/').pop()!.replace(/_/g, ' ')} time`, range];
  });
}

export function ForexMarketHoursPage() {
  const prerender = typeof window !== 'undefined' && Boolean((window as { __PRERENDER__?: boolean }).__PRERENDER__);
  const [now, setNow] = useState<number | null>(null);
  const [zone, setZone] = useState('UTC');
  const [day, setDay] = useState(() => dayIn(Date.now(), 'UTC'));

  useEffect(() => {
    if (prerender) return;
    const z = browserZone();
    const t = Date.now();
    setZone(z);
    setDay(dayIn(t, z));
    setNow(t);
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [prerender]);

  const zones = useMemo(() => (ZONES.includes(zone) ? ZONES : [zone, ...ZONES]), [zone]);
  const view = useMemo(() => sessionsOnDay(day, zone), [day, zone]);
  const status = useMemo(() => (now === null ? null : sessionsNow(now)), [now]);
  const year = Number(day.slice(0, 4));
  const changes = useMemo(
    () => ['Europe/London', 'America/New_York', 'Australia/Sydney'].flatMap((z) => clockChanges(year, z)).sort((a, b) => a.day.localeCompare(b.day)),
    [year],
  );
  const lnPeriods = useMemo(() => londonNewYorkByPeriod(year), [year]);
  const length = view.window.end - view.window.start;
  const pos = (ms: number) => `${((ms - view.window.start) / length) * 100}%`;
  const wide = (a: number, b: number) => `${((b - a) / length) * 100}%`;
  const nowInDay = now !== null && now >= view.window.start && now < view.window.end;
  const ticks = [0, 3, 6, 9, 12, 15, 18, 21].map((h) => ({ h, at: instantAt(day, h * 60, zone) }));
  const summer = utcRows(`${year}-07-15`);
  const winter = utcRows(`${year}-01-14`);

  return (
    <ContentPageShell title={TITLE} description={DESCRIPTION} path={PATH} jsonLd={calculatorSchema(NAME, DESCRIPTION, PATH, FAQ)} maxWidth="max-w-5xl">
      <Crumbs parent={{ path: '/resources', label: 'Resources' }} current="Forex market hours" />
      <h1 className="mb-2 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">Forex market hours and sessions clock</h1>
      <p className="mb-6 text-base text-foreground-soft">
        Which sessions are open now, when London and New York overlap in your time zone, and how daylight saving moves them.
      </p>

      <div className="max-w-[72ch]">
        <ShortAnswer>
          Forex trades from Sunday 17:00 to Friday 17:00 New York time. In UTC, London runs 08:00-17:00 in the northern winter and 07:00-16:00 in summer,
          New York 13:00-22:00 and 12:00-21:00, and they overlap 13:00-17:00 in winter and 12:00-16:00 in summer (18:30-22:30 and 17:30-21:30 in India).
          Pick your time zone below for today&apos;s times.
        </ShortAnswer>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-2xl">
        <div>
          <label htmlFor="fx-zone" className={calcLabelClass}>
            Your time zone
          </label>
          <select id="fx-zone" value={zone} onChange={(e) => setZone(e.target.value)} className={calcInputClass}>
            {zones.map((z) => (
              <option key={z} value={z}>
                {zoneName(z)} ({offsetLabel(instantAt(day, 12 * 60, 'UTC'), z)})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="fx-day" className={calcLabelClass}>
            Day
          </label>
          <input id="fx-day" type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} className={calcInputClass} />
        </div>
      </div>

      <section aria-labelledby="fx-now" className="panel mb-6 p-5">
        <h2 id="fx-now" className="mb-3 text-base font-semibold text-foreground">
          Right now
        </h2>
        {now === null || !status ? (
          <p className="text-sm text-foreground-soft">The live clock starts in your browser: it reads your time zone and shows which sessions are open.</p>
        ) : (
          <>
            <p className="mb-3 text-sm text-foreground">
              <span className="num font-semibold">{fmt(now, zone, true)}</span> in {zoneName(zone)} ({offsetLabel(now, zone)}).{' '}
              {isMarketOpen(now) ? 'The forex market is open.' : 'The forex market is closed for the weekend.'}
            </p>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {status.map((s) => (
                <li key={s.id} className="rounded-md border border-border p-3 text-sm">
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    <span aria-hidden="true" className={cn('inline-block h-2.5 w-2.5 rounded-sm', COLORS[s.id])} />
                    {NAMES[s.id]}: {s.open ? 'open' : 'closed'}
                  </span>
                  {s.changeAt !== null && (
                    <span className="mt-1 block text-foreground-soft">
                      {s.open ? 'Closes' : 'Opens'} {fmt(s.changeAt, zone, true)} (in {until(s.changeAt, now)})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section aria-labelledby="fx-day-h" className="mb-12">
        <h2 id="fx-day-h" className="mb-1 text-2xl font-bold text-foreground">
          Sessions on {longDay(day)}
        </h2>
        <p className="mb-4 text-sm text-foreground-soft">
          In {zoneName(zone)} time ({offsetLabel(instantAt(day, 12 * 60, zone), zone)}). The bars show the day from 00:00 to 24:00 on your clock.
        </p>
        <div aria-hidden="true" className="mb-4 rounded-lg border border-border bg-card p-3">
          <div className="relative mb-1 h-4 text-xs text-muted-foreground">
            {ticks.map((t) => (
              <span key={t.h} className="absolute -translate-x-1/2 first:translate-x-0" style={{ left: pos(t.at) }}>
                {String(t.h).padStart(2, '0')}
              </span>
            ))}
          </div>
          <div className="relative space-y-1.5">
            {SESSIONS.map((s) => (
              <div key={s.id} className="relative h-6 rounded bg-secondary/60">
                <span className="absolute left-1 top-0.5 z-10 text-xs font-medium text-foreground">{s.name}</span>
                {view.sessions
                  .filter((x) => x.id === s.id)
                  .map((x) => (
                    <span key={x.start} className={cn('absolute top-0 h-6 rounded', COLORS[s.id])} style={{ left: pos(x.start), width: wide(x.start, x.end) }} />
                  ))}
              </div>
            ))}
            {nowInDay && <span className="absolute -top-1 bottom-0 w-0.5 bg-foreground" style={{ left: pos(now!) }} />}
          </div>
        </div>
        {view.sessions.length === 0 ? (
          <p className="text-sm text-foreground">No session trades on this day: the market is closed for the weekend.</p>
        ) : (
          <Table
            caption={`Session times on ${longDay(day)}, ${zoneName(zone)} time`}
            head={['Session', 'Opens', 'Closes']}
            rows={view.sessions.map((x) => [NAMES[x.id], fmt(x.start, zone, false), x.end === view.window.end ? '24:00' : fmt(x.end, zone, false)])}
          />
        )}
        {view.overlaps.length > 0 && (
          <Table
            caption="Overlaps (two sessions open at once)"
            head={['Overlap', 'From', 'To', 'Length']}
            rows={view.overlaps.map((o) => [
              `${NAMES[o.a]} and ${NAMES[o.b]}`,
              fmt(o.start, zone, false),
              o.end === view.window.end ? '24:00' : fmt(o.end, zone, false),
              `${Math.round((o.end - o.start) / 60_000 / 60 * 10) / 10} h`,
            ])}
          />
        )}
        <p className="text-xs text-muted-foreground">
          Sessions run on their own city&apos;s weekdays and only while the weekly market is open. Bank holidays are not shown.
        </p>
      </section>

      <div className="max-w-[72ch]">
        <H2>Session times in UTC, summer and winter</H2>
        <P>
          Each session is fixed on its own city&apos;s clock, so its UTC time depends on the season. The table works {year} out from the time-zone
          database for a mid-January and a mid-July weekday.
        </P>
        <Table caption={`Mid-July ${year} (UK and US on summer time, Sydney on standard time)`} head={['Session', 'Local hours', 'UTC']} rows={summer} />
        <Table caption={`Mid-January ${year} (UK and US on standard time, Sydney on summer time)`} head={['Session', 'Local hours', 'UTC']} rows={winter} />

        <H2>Clock changes in {year}</H2>
        <P>
          Tokyo has no daylight saving. The other three cities change on different Sundays, and Sydney&apos;s summer is the northern winter, so the gaps
          between sessions move several times a year:
        </P>
        <Table
          caption={`Daylight-saving changes in ${year}`}
          head={['Date', 'City', 'Change']}
          rows={changes.map((c) => [
            longDay(c.day),
            zoneName(c.zone),
            `${c.toOffset > c.fromOffset ? 'Clocks forward' : 'Clocks back'}: ${offsetText(c.fromOffset)} to ${offsetText(c.toOffset)}`,
          ])}
        />

        <H2>The London and New York overlap through {year}</H2>
        <P>
          The overlap is the busiest stretch of the forex day for most pairs. Because the US changes its clocks a few weeks before the UK in spring and a
          week after it in autumn, the overlap is an hour longer in those weeks:
        </P>
        <Table
          caption={`London-New York overlap on weekdays in ${year}, UTC`}
          head={['From', 'To', 'Overlap (UTC)', 'Length']}
          rows={lnPeriods.map((p) => [
            shortDay(p.from),
            shortDay(p.to),
            p.startUtc === null || p.endUtc === null ? 'none' : `${hhmm(p.startUtc)} - ${hhmm(p.endUtc)}`,
            p.startUtc === null || p.endUtc === null ? '-' : `${(p.endUtc - p.startUtc) / 60} h`,
          ])}
        />
        <P>
          To read the table in your own time, add your offset from UTC: India is UTC+5:30, Pakistan UTC+5, Nigeria UTC+1, South Africa UTC+2, Kenya
          UTC+3, the UAE UTC+4, the Philippines and Malaysia UTC+8. Those countries do not use daylight saving, so only the
          sessions move for them; the clock above does the sum for any zone.
        </P>

        <Callout title="Sessions are a convention">
          No exchange opens or closes forex. The hours here follow the convention BabyPips publishes (local business hours in each city), and other sites
          shift a session by an hour. Brokers also set their own trading hours, and some pause briefly around the daily rollover at 17:00 New York
          time.
        </Callout>

        <H2>Journal by session</H2>
        <P>
          A session clock tells you when the market is busy, not whether your own trades work then. Record the session of each trade and compare them
          once you have enough trades in each. In TradeQut you tag a trade&apos;s session (Asian, London Open, NY Open, London/NY Overlap and others,
          several trades at once with bulk edit) and Analytics shows results by session, by hour and by weekday; the what-if replay can show your
          results without one session or without the trades after a chosen time. The session tag is yours to set; it is not filled in from the trade
          time.
        </P>
        <P>
          If you import a <A to="/mt5-trading-journal">MetaTrader 5</A> or <A to="/mt4-trading-journal">MetaTrader 4</A> report, its times are the
          broker&apos;s server time. TradeQut reads them as UTC and warns you on import, so if your broker&apos;s server is not on UTC the hour
          breakdown is shifted by that offset. More on journaling forex in the <A to="/forex-trading-journal">forex trading journal</A> guide. Related
          tools: <A to="/resources/position-size">position size</A>, <A to="/resources/pip-calculator">pip value</A> and{' '}
          <A to="/resources/prop-firm-drawdown-calculator">prop-firm drawdown</A>.
        </P>

        <Faq items={FAQ} />
        <Sources
          items={[
            { label: 'BabyPips: Forex Market Hours (session convention, weekly open and close)', url: 'https://www.babypips.com/tools/forex-market-hours', checked: '2026-11-15' },
            { label: 'IANA Time Zone Database (the data behind every browser\'s time zones)', url: 'https://www.iana.org/time-zones', checked: '2026-11-15' },
          ]}
        />
        <Disclaimer>
          Educational tool. Session hours are conventions and broker hours differ. TradeQut is a journaling and analytics tool, not an investment adviser,
          and nothing here is a recommendation to trade at any time or in any market.
        </Disclaimer>
        <SignupCta />
      </div>
    </ContentPageShell>
  );
}
