import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ContentPageShell } from '@/components/content/ContentPageShell';
import { A, Callout, Disclaimer, Faq, H2, P, RelatedLinks, ShortAnswer, SignupCta, Sources, Table } from '@/content/components/ArticleParts';
import { browserZone } from '@/components/settings/timeZones';
import { breadcrumbList, faqSchema } from '@/config/seo';
import { SITE_URL, type FaqItem } from '@/content/product-facts';
import {
  CLOCK_PATH,
  SESSION_PAGES,
  SESSION_PATHS,
  SESSION_ZONES,
  clockTime,
  dayLabel,
  makeCtx,
  zoneTable,
  type Ctx,
  type Rich,
  type SessionPageContent,
  type SessionPageId,
  type WindowId,
} from '@/content/forex-sessions';
import { SESSIONS, addDays, dayIn, isMarketOpen, offsetAt, overlaps, sessionIntervals, sessionOn, utcOffsetText, type Interval } from '@/lib/forex/sessions';

const DAY = 86_400_000;

function SessionCrumbs({ current }: { current: string }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        {[
          { path: '/resources', label: 'Resources' },
          { path: CLOCK_PATH, label: 'Forex market hours' },
        ].map((c) => (
          <Fragment key={c.path}>
            <li>
              <Link to={c.path} className="inline-flex min-h-6 max-md:min-h-11 items-center hover:text-foreground">
                {c.label}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
          </Fragment>
        ))}
        <li className="font-medium text-foreground">{current}</li>
      </ol>
    </nav>
  );
}

export function sessionSchema(p: SessionPageContent, faq: FaqItem[]) {
  const url = `${SITE_URL}${p.path}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', name: p.h1, description: p.description, url, isPartOf: { '@type': 'WebSite', name: 'TradeQut', url: SITE_URL } },
      breadcrumbList([
        { name: 'Home', url: SITE_URL },
        { name: 'Resources', url: `${SITE_URL}/resources` },
        { name: 'Forex market hours', url: `${SITE_URL}${CLOCK_PATH}` },
        { name: p.crumb, url },
      ]),
      faqSchema(faq),
    ],
  };
}

const rich = (parts: Rich[]): ReactNode =>
  parts.map((x, i) => <Fragment key={i}>{typeof x === 'string' ? x : <A to={x.to}>{x.text}</A>}</Fragment>);

/** The visitor's clock; null in the saved (prerendered) HTML and on the first client render, so both show the same text. */
function useVisitor(): { now: number; zone: string } | null {
  const [visitor, setVisitor] = useState<{ now: number; zone: string } | null>(null);
  useEffect(() => {
    if ((window as { __PRERENDER__?: boolean }).__PRERENDER__) return;
    const tick = () => setVisitor({ now: Date.now(), zone: browserZone() });
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);
  return visitor;
}

/** The current interval of a session or the overlap, else the next one. */
function currentOrNext(w: WindowId, now: number): Interval | null {
  const all = sessionIntervals(now - DAY, now + 8 * DAY);
  const mine = w === 'overlap' ? overlaps(all).filter((o) => o.a === 'london' && o.b === 'newYork') : all.filter((x) => x.id === w);
  return mine.find((x) => x.end > now) ?? null;
}

const zoneName = (zone: string) => (zone === 'UTC' ? 'UTC' : zone.split('/').pop()!.replace(/_/g, ' '));

export function TodayLine({ items }: { items: { window: WindowId; name: string }[] }) {
  const visitor = useVisitor();
  let text: string;
  if (!visitor) {
    text = `Today's times in your own time zone appear here once the page has loaded; the table below gives them for ${SESSION_ZONES.length} time zones.`;
  } else {
    const { now, zone } = visitor;
    const today = dayIn(now, zone);
    const when = (ms: number) => {
      const d = dayIn(ms, zone);
      const day = d === today ? 'today' : d === addDays(today, 1) ? 'tomorrow' : d === addDays(today, -1) ? 'yesterday' : `on ${dayLabel(d)}`;
      return `${clockTime(ms, zone)} ${day}`;
    };
    const where = `${zoneName(zone)}, ${utcOffsetText(offsetAt(now, zone))}`;
    const lines = items.map(({ window: w, name }, i) => {
      const x = currentOrNext(w, now);
      if (!x) return '';
      if (x.start <= now) return `The ${name} is open now${i ? '' : ` in your time zone (${where})`}: it opened at ${when(x.start)} and closes at ${when(x.end)}.`;
      const city = SESSIONS.find((s) => s.id === w);
      const withWeek = city && x.start > sessionOn(city.id, dayIn(x.start, city.zone)).start ? ', starting when the weekly market opens' : '';
      return `${i ? 'The' : `In your time zone (${where}) the`} ${name} ${dayIn(x.start, zone) === today ? 'opens' : 'next opens'} at ${when(x.start)} and closes at ${when(x.end)}${withWeek}.`;
    });
    text = `${isMarketOpen(now) ? '' : 'The forex market is closed for the weekend. '}${lines.filter(Boolean).join(' ')}`;
  }
  return (
    <div data-testid="session-today" className="panel mb-6 p-5">
      <p className="text-base text-foreground">{text}</p>
    </div>
  );
}

/** `18:30–03:30` stays on one line; `next day` and the overlap length may wrap. */
function Cell({ text }: { text: string }) {
  const [range, ...rest] = text.split(' ');
  return (
    <>
      <span className="num whitespace-nowrap text-foreground">{range}</span>
      {rest.length > 0 && <span className="block text-xs">{rest.join(' ')}</span>}
    </>
  );
}

export function ZoneTable({ window: w, heading, c }: { window: WindowId; heading: string; c: Ctx }) {
  const t = useMemo(() => zoneTable(w, c), [w, c]);
  return (
    <div className="mt-2">
      <Table
        caption={`${heading}, ${c.year}`}
        head={[
          'Time zone',
          ...t.columns.map((col) => (
            <>
              {col.label}
              <span className="block text-xs font-normal text-muted-foreground">{col.dates}</span>
            </>
          )),
        ]}
        rows={t.rows.map((r) => [
          <>
            <span className="font-medium text-foreground">{r.name}</span>
            {r.offsets && <span className="block text-xs">{r.offsets}</span>}
          </>,
          ...r.cells.map((cell) => <Cell text={cell} />),
        ])}
      />
      {t.notes.map((n) => (
        <p key={n} className="-mt-3 mb-6 text-xs text-muted-foreground">
          {n}
        </p>
      ))}
    </div>
  );
}

export function SessionPage({ id }: { id: SessionPageId }) {
  const p = SESSION_PAGES[id];
  const [year] = useState(() => new Date().getUTCFullYear());
  const c = useMemo(() => makeCtx(year), [year]);
  const faq = useMemo(() => p.faq(c), [p, c]);
  const sections = useMemo(() => p.sections(c), [p, c]);
  const related = [
    { to: CLOCK_PATH, label: 'Forex market hours and sessions clock (all four sessions, any date)' },
    ...(Object.keys(SESSION_PAGES) as SessionPageId[]).filter((k) => k !== id).map((k) => ({ to: SESSION_PATHS[k], label: SESSION_PAGES[k].h1 })),
  ];

  return (
    <ContentPageShell title={p.title} description={p.description} path={p.path} jsonLd={sessionSchema(p, faq)} maxWidth="max-w-5xl">
      <SessionCrumbs current={p.crumb} />
      <h1 className="mb-2 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">{p.h1}</h1>
      <p className="mb-6 max-w-[72ch] text-base text-foreground-soft">{p.lede}</p>
      <div className="max-w-[72ch]">
        <TodayLine items={p.today} />
        <ShortAnswer>{p.shortAnswer(c)}</ShortAnswer>
      </div>

      <div className="max-w-[72ch]">
        <H2 id="zones">{p.table.heading}</H2>
        <P>
          Each column is a stretch of {c.year}: winter, when the UK, Europe and the US are on standard time; the weeks when the US has changed its
          clocks and the UK and Europe have not; and summer, when all three are on summer time. Times are for a weekday on each zone&apos;s own
          clock, and &quot;next day&quot; means the session ends after midnight there.
        </P>
      </div>
      <ZoneTable window={p.table.window} heading={p.table.heading} c={c} />

      {sections.map((s) => (
        <Fragment key={s.heading}>
          <div className="max-w-[72ch]">
            <H2>{s.heading}</H2>
            {s.paragraphs.map((para, i) => (
              <P key={i}>{rich(para)}</P>
            ))}
          </div>
          {s.table && <ZoneTable window={s.table.window} heading={s.table.heading} c={c} />}
        </Fragment>
      ))}

      <div className="max-w-[72ch]">
        <Callout title="Session hours are a convention">
          {p.convention} No exchange opens or closes forex, other sites shift a session by an hour, and your broker sets its own trading hours.
          Sessions trade on their own city&apos;s weekdays, inside the weekly market from Sunday 17:00 to Friday 17:00 New York time.
        </Callout>
        <H2>Journal by session</H2>
        <P>{rich(p.journal)}</P>
        <RelatedLinks links={related} />
        <Faq items={faq} />
        <Sources items={p.sources} />
        <Disclaimer>
          Educational page. Session hours are conventions and broker hours differ. TradeQut is a journaling and analytics tool, not an investment
          adviser, and nothing here is a recommendation to trade at any time or in any market.
        </Disclaimer>
        <SignupCta />
      </div>
    </ContentPageShell>
  );
}
