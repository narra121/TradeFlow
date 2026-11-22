import type { FaqItem } from './product-facts';
import type { Source } from './components/ArticleParts';
import {
  addDays,
  clockArrangements,
  clockChanges,
  dayIn,
  instantAt,
  londonNewYorkOn,
  offsetAt,
  sessionOn,
  utcOffsetText,
  weekdayOf,
  type Arrangement,
  type DayRun,
  type Interval,
} from '@/lib/forex/sessions';

/**
 * Content of the four session pages under /resources/forex-market-hours/. Every time and date is worked out from the
 * session engine (src/lib/forex/sessions.ts) for the year shown, so the text stays right when the clocks change and
 * when the year rolls over; the claims around the numbers are listed in each page's `sources`.
 */

export type SessionPageId = 'newYork' | 'london' | 'asian' | 'overlap';
export type WindowId = 'newYork' | 'london' | 'tokyo' | 'sydney' | 'overlap';
export type SeasonKey = 'winter' | 'usOnly' | 'bothDst' | 'summer';

export const SESSION_ZONES: { zone: string; name: string }[] = [
  { zone: 'America/New_York', name: 'New York (ET)' },
  { zone: 'America/Chicago', name: 'Chicago (CT)' },
  { zone: 'America/Los_Angeles', name: 'Los Angeles (PT)' },
  { zone: 'UTC', name: 'UTC' },
  { zone: 'Europe/London', name: 'London (UK time)' },
  { zone: 'Europe/Berlin', name: 'Central Europe (Berlin, Paris)' },
  { zone: 'Africa/Lagos', name: 'Lagos' },
  { zone: 'Africa/Johannesburg', name: 'Johannesburg' },
  { zone: 'Africa/Nairobi', name: 'Nairobi' },
  { zone: 'Asia/Dubai', name: 'Dubai' },
  { zone: 'Asia/Karachi', name: 'Karachi' },
  { zone: 'Asia/Kolkata', name: 'India (IST)' },
  { zone: 'Asia/Singapore', name: 'Singapore' },
  { zone: 'Asia/Manila', name: 'Manila' },
  { zone: 'Asia/Tokyo', name: 'Tokyo' },
  { zone: 'Australia/Sydney', name: 'Sydney' },
];

const NY = 'America/New_York';
const LDN = 'Europe/London';
const IST = 'Asia/Kolkata';
const SYD = 'Australia/Sydney';
const HOUR = 3_600_000;

const WINDOWS: Record<WindowId, (day: string) => Interval> = {
  newYork: (d) => sessionOn('newYork', d),
  london: (d) => sessionOn('london', d),
  tokyo: (d) => sessionOn('tokyo', d),
  sydney: (d) => sessionOn('sydney', d),
  overlap: (d) => londonNewYorkOn(d)!,
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dayMonth = (day: string) => `${Number(day.slice(8, 10))} ${MONTHS[Number(day.slice(5, 7)) - 1]}`;

/** `Monday 23 Nov`. */
export const dayLabel = (day: string) => `${WEEKDAYS[weekdayOf(day)]} ${dayMonth(day)}`;

/** `Sunday 8 Mar 2026`. */
export const longDate = (day: string) => `${dayLabel(day)} ${day.slice(0, 4)}`;

/** `8–28 Mar and 25–31 Oct`; adjacent runs are joined. */
export function runsText(runs: DayRun[]): string {
  const joined: DayRun[] = [];
  for (const r of [...runs].sort((a, b) => a.from.localeCompare(b.from))) {
    const last = joined[joined.length - 1];
    if (last && addDays(last.to, 1) === r.from) last.to = r.to;
    else joined.push({ ...r });
  }
  const parts = joined.map((r) =>
    r.from.slice(5, 7) === r.to.slice(5, 7) ? `${Number(r.from.slice(8, 10))}–${dayMonth(r.to)}` : `${dayMonth(r.from)}–${dayMonth(r.to)}`,
  );
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];
}

export function seasonsOf(year: number): Record<SeasonKey, Arrangement> {
  const all = clockArrangements(year);
  const pick = (newYork: boolean, london: boolean, sydney: boolean) =>
    all.find((a) => a.dst.newYork === newYork && a.dst.london === london && a.dst.sydney === sydney)!;
  return { winter: pick(false, false, true), usOnly: pick(true, false, true), bothDst: pick(true, true, true), summer: pick(true, true, false) };
}

/** `HH:MM` on `zone`'s clock. */
export const clockTime = (ms: number, zone: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(ms));

/** A session or the overlap on `day` of its own city, read on `zone`'s clock. */
export function windowTimes(w: WindowId, zone: string, day: string) {
  const { start, end } = WINDOWS[w](day);
  return { open: clockTime(start, zone), close: clockTime(end, zone), nextDay: dayIn(end, zone) > dayIn(start, zone), hours: (end - start) / HOUR };
}

/** One table cell: `18:30–03:30 next day`, with the length for the overlap. */
export function cellText(w: WindowId, zone: string, day: string): string {
  const t = windowTimes(w, zone, day);
  return `${t.open}–${t.close}${t.nextDay ? ' next day' : ''}${w === 'overlap' ? ` (${t.hours} h)` : ''}`;
}

const shared = (a: Interval, b: Interval) => Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start)) / HOUR;
const hoursText = (n: number) => `${n} hour${n === 1 ? '' : 's'}`;

export interface Ctx {
  year: number;
  seasons: Record<SeasonKey, Arrangement>;
  /** `13:00–22:00` on `zone`'s clock in a season. */
  at(w: WindowId, zone: string, s: SeasonKey): string;
  open(w: WindowId, zone: string, s: SeasonKey): string;
  close(w: WindowId, zone: string, s: SeasonKey): string;
  hours(w: WindowId, s: SeasonKey): number;
  /** The days of the year in these seasons, with the year: `8–28 Mar and 25–31 Oct 2026`. */
  dates(...s: SeasonKey[]): string;
  /** The year's clock changes in `zone`, in date order. */
  changes(zone: string): { text: string; forward: boolean }[];
  /** `zone`'s clock when `cityZone` reads `minutes` after midnight, on a weekday of season `s`. */
  clockAt(cityZone: string, minutes: number, zone: string, s: SeasonKey): string;
  /** Hours two sessions share on a weekday of season `s`; `bNextDay` reads `b` on the following city day. */
  sharedHours(a: WindowId, b: WindowId, s: SeasonKey, bNextDay?: boolean): number;
  /** `zone`'s clock at the weekly open (Sunday 17:00 New York time) in season `s`. */
  weekOpen(zone: string, s: SeasonKey): string;
}

export function makeCtx(year: number): Ctx {
  const seasons = seasonsOf(year);
  const t = (w: WindowId, zone: string, s: SeasonKey) => windowTimes(w, zone, seasons[s].sample);
  return {
    year,
    seasons,
    at: (w, zone, s) => `${t(w, zone, s).open}–${t(w, zone, s).close}`,
    open: (w, zone, s) => t(w, zone, s).open,
    close: (w, zone, s) => t(w, zone, s).close,
    hours: (w, s) => t(w, 'UTC', s).hours,
    dates: (...s) => `${runsText(s.flatMap((k) => seasons[k].runs))} ${year}`,
    changes: (zone) => clockChanges(year, zone).map((c) => ({ text: longDate(c.day), forward: c.toOffset > c.fromOffset })),
    clockAt: (cityZone, minutes, zone, s) => clockTime(instantAt(seasons[s].sample, minutes, cityZone), zone),
    sharedHours: (a, b, s, bNextDay = false) => shared(WINDOWS[a](seasons[s].sample), WINDOWS[b](bNextDay ? addDays(seasons[s].sample, 1) : seasons[s].sample)),
    weekOpen: (zone, s) => clockTime(instantAt(addDays(seasons[s].sample, -weekdayOf(seasons[s].sample)), 17 * 60, NY), zone),
  };
}

const offsetsText = (zone: string, samples: string[]) =>
  [...new Set(samples.map((d) => offsetAt(instantAt(d, 12 * 60, 'UTC'), zone)))].map(utcOffsetText).join(' / ');

/** Table zones other than UTC whose offset never changes in the year. */
export function fixedZones(c: Ctx): { zone: string; name: string }[] {
  const samples = Object.values(c.seasons).map((a) => a.sample);
  return SESSION_ZONES.filter((z) => z.zone !== 'UTC' && !offsetsText(z.zone, samples).includes('/'));
}

export interface ZoneColumn {
  key: SeasonKey;
  label: string;
  dates: string;
}

export interface ZoneTableData {
  columns: ZoneColumn[];
  rows: { zone: string; name: string; offsets: string; cells: string[] }[];
  /** For a row that alone differs in the weeks Sydney and the northern cities are all on daylight time. */
  notes: string[];
}

/**
 * Open and close in every table zone for winter, the weeks the US has changed its clocks and the UK has not, and summer.
 * The weeks when Sydney is on daylight time during the northern summer get their own column only when more than one
 * row differs in them (the Sydney session); otherwise the one row that differs gets a note.
 */
export function zoneTable(w: WindowId, c: Ctx): ZoneTableData {
  const cell = (zone: string, s: SeasonKey) => cellText(w, zone, c.seasons[s].sample);
  const differing = SESSION_ZONES.filter((z) => cell(z.zone, 'bothDst') !== cell(z.zone, 'summer'));
  const ownColumn = differing.length > 1;
  const keys: SeasonKey[] = ownColumn ? ['winter', 'usOnly', 'bothDst', 'summer'] : ['winter', 'usOnly', 'summer'];
  const label: Record<SeasonKey, string> = {
    winter: 'Winter',
    usOnly: 'US changed, UK not',
    bothDst: 'Summer, Sydney on daylight time',
    summer: ownColumn ? 'Summer, Sydney on standard time' : 'Summer',
  };
  return {
    columns: keys.map((key) => ({
      key,
      label: label[key],
      dates: runsText(key === 'summer' && !ownColumn ? [...c.seasons.bothDst.runs, ...c.seasons.summer.runs] : c.seasons[key].runs),
    })),
    rows: SESSION_ZONES.map((z) => ({
      ...z,
      offsets: z.zone === 'UTC' ? '' : offsetsText(z.zone, keys.map((k) => c.seasons[k].sample)),
      cells: keys.map((k) => cell(z.zone, k)),
    })),
    notes: ownColumn
      ? []
      : differing.map((z) => `${z.name}: ${cell(z.zone, 'bothDst')} from ${c.dates('bothDst')}, while Sydney is on daylight time and the UK, Europe and the US are on summer time.`),
  };
}

/** Running text; a link is `{ to, text }`. */
export type Rich = string | { to: string; text: string };

export interface Block {
  heading: string;
  paragraphs: Rich[][];
  /** A zone table shown after the paragraphs. */
  table?: { window: WindowId; heading: string };
}

export interface SessionPageContent {
  id: SessionPageId;
  path: string;
  crumb: string;
  title: string;
  description: string;
  h1: string;
  lede: string;
  /** What the "today in your time zone" line reports, in order. */
  today: { window: WindowId; name: string }[];
  table: { window: WindowId; heading: string };
  shortAnswer(c: Ctx): string;
  sections(c: Ctx): Block[];
  faq(c: Ctx): FaqItem[];
  /** Where this page's hours come from; the shell adds that they are a convention. */
  convention: string;
  journal: Rich[];
  sources: Source[];
}

export const CLOCK_PATH = '/resources/forex-market-hours';
export const SESSION_PATHS: Record<SessionPageId, string> = {
  newYork: `${CLOCK_PATH}/new-york-session`,
  london: `${CLOCK_PATH}/london-session`,
  asian: `${CLOCK_PATH}/asian-session`,
  overlap: `${CLOCK_PATH}/london-new-york-overlap`,
};

const CHECKED = '2026-11-21';
const SRC = {
  babypipsHours: { label: 'BabyPips: Forex Market Hours (session hours, weekly open and close, daylight-saving rules)', url: 'https://www.babypips.com/tools/forex-market-hours', checked: CHECKED },
  babypipsNy: { label: 'BabyPips School: New York session', url: 'https://www.babypips.com/learn/forex/new-york-session', checked: CHECKED },
  babypipsLondon: { label: 'BabyPips School: London session', url: 'https://www.babypips.com/learn/forex/london-session', checked: CHECKED },
  babypipsTokyo: { label: 'BabyPips School: Tokyo session', url: 'https://www.babypips.com/learn/forex/tokyo-session', checked: CHECKED },
  babypipsSydney: { label: 'BabyPips School: Sydney session', url: 'https://www.babypips.com/learn/forex/sydney-session', checked: CHECKED },
  usCode: { label: '15 U.S.C. § 260a: daylight saving time in the United States', url: 'https://www.law.cornell.edu/uscode/text/15/260a', checked: CHECKED },
  govUk: { label: 'GOV.UK: When do the clocks change?', url: 'https://www.gov.uk/when-do-the-clocks-change', checked: CHECKED },
  euSummer: { label: 'European Commission: Summertime (Directive 2000/84/EC)', url: 'https://transport.ec.europa.eu/transport-themes/summertime_en', checked: CHECKED },
  nsw: { label: 'NSW Government: Daylight saving', url: 'https://www.nsw.gov.au/about-nsw/daylight-saving', checked: CHECKED },
  nyse: { label: 'NYSE: Holidays and trading hours', url: 'https://www.nyse.com/markets/hours-calendars', checked: CHECKED },
  bls: { label: 'US Bureau of Labor Statistics: The Employment Situation (release time)', url: 'https://www.bls.gov/news.release/empsit.nr0.htm', checked: CHECKED },
  bis: { label: 'BIS Triennial Central Bank Survey 2025: OTC foreign exchange turnover in April 2025', url: 'https://www.bis.org/statistics/rpfx25_fx.htm', checked: CHECKED },
  bisAnnex: { label: 'BIS Triennial Survey 2025, FX turnover annex, Table 1 (turnover by country)', url: 'https://www.bis.org/publications/triennial-survey/rpfx25-fx-annex-2606.pdf', checked: CHECKED },
  lseg: { label: 'LSEG: WMR FX benchmarks (4:00 pm London closing spot rates)', url: 'https://www.lseg.com/en/ftse-russell/benchmarks/wmr-fx-benchmarks', checked: CHECKED },
  iana: { label: 'IANA Time Zone Database (the data behind every browser\'s time zones)', url: 'https://www.iana.org/time-zones', checked: CHECKED },
} satisfies Record<string, Source>;

const CLOCK: Rich = { to: CLOCK_PATH, text: 'forex market hours clock' };
const OVERLAP_LINK: Rich = { to: SESSION_PATHS.overlap, text: 'London–New York overlap' };
const JOURNAL: Rich = { to: '/forex-trading-journal', text: 'forex trading journal' };

const forward = (c: Ctx, zone: string) => c.changes(zone).find((x) => x.forward)!.text;
const back = (c: Ctx, zone: string) => c.changes(zone).find((x) => !x.forward)!.text;
const shortName = (name: string) => name.replace(/ \(.*\)$/, '');
const listText = (xs: string[]) => `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
const fixedNames = (c: Ctx) => listText(fixedZones(c).map((z) => shortName(z.name)));

const journal = (tags: string): Rich[] => [
  `In TradeQut the session is a tag you set on each trade, not something read from the trade time. ${tags} Analytics shows results by session, hour and weekday. More in the `,
  JOURNAL,
  ' guide, or see every session at once on the ',
  CLOCK,
  '.',
];

const NEW_YORK: SessionPageContent = {
  id: 'newYork',
  path: SESSION_PATHS.newYork,
  crumb: 'New York session',
  title: 'New York forex session time in your time zone | TradeQut',
  description: 'The New York forex session runs 08:00–17:00 New York time. Its open and close in UK time, EST, CST, PST, IST and more, in summer, winter and the weeks between.',
  h1: 'New York forex session time',
  lede: 'When the New York (North American) session opens and closes on your clock, in summer and in winter, and why it is not the 09:30 stock market open.',
  today: [{ window: 'newYork', name: 'New York session' }],
  table: { window: 'newYork', heading: 'New York session times by time zone' },
  shortAnswer: (c) =>
    `By the usual convention the New York session runs 08:00–17:00 New York time (ET) all year. That is ${c.at('newYork', LDN, 'winter')} UK time for most of the year, and ${c.at('newYork', LDN, 'usOnly')} in the weeks when the US has changed its clocks and the UK has not (${c.dates('usOnly')}). In UTC it is ${c.at('newYork', 'UTC', 'winter')} in winter and ${c.at('newYork', 'UTC', 'summer')} while New York is on daylight time; in India ${c.at('newYork', IST, 'winter')} or ${c.at('newYork', IST, 'summer')} IST, closing after midnight.`,
  sections: (c) => [
    {
      heading: 'New York session or New York stock market?',
      paragraphs: [
        [
          'You will also see 09:30 given as the New York open. That is the New York Stock Exchange, whose core trading session runs from 9:30 a.m. to 4:00 p.m. ET. Forex has no exchange: its New York session is a convention for the working day of the dealing desks in New York, 08:00 to 17:00 ET in the convention BabyPips publishes, which also calls it the North American session.',
        ],
        ['So the stock market opens an hour and a half into the forex session and closes an hour before it ends.'],
      ],
    },
    {
      heading: `US clock changes in ${c.year}`,
      paragraphs: [
        [
          `The US moves to daylight time at 2:00 a.m. local time on the second Sunday of March and back on the first Sunday of November (15 U.S.C. § 260a). In ${c.year} that is ${forward(c, NY)} and ${back(c, NY)}. Chicago and Los Angeles change at 2:00 a.m. on their own clocks on the same Sundays, so the session stays ${c.at('newYork', 'America/Chicago', 'winter')} in Chicago and ${c.at('newYork', 'America/Los_Angeles', 'winter')} in Los Angeles all year.`,
        ],
        [
          `The UK and Central Europe change on other Sundays (${forward(c, LDN)} and ${back(c, LDN)}), so from ${c.dates('usOnly')} the session starts an hour early on their clocks: ${c.at('newYork', LDN, 'usOnly')} UK time and ${c.at('newYork', 'Europe/Berlin', 'usOnly')} in Berlin and Paris, instead of ${c.at('newYork', LDN, 'winter')} and ${c.at('newYork', 'Europe/Berlin', 'winter')}.`,
        ],
        [
          `${fixedNames(c)} do not change their clocks, so there the session moves twice a year with New York: an hour earlier from ${forward(c, NY)} and back on ${back(c, NY)}. In Dubai, for example, it is ${c.at('newYork', 'Asia/Dubai', 'winter')} in winter and ${c.at('newYork', 'Asia/Dubai', 'summer')} while New York is on daylight time.`,
        ],
      ],
    },
    {
      heading: 'What happens in the New York session',
      paragraphs: [
        [
          'BabyPips notes that most major US economic reports come out during the New York session. The monthly US jobs report (the Employment Situation) is one: the Bureau of Labor Statistics release of 6 November 2026, for example, was embargoed until 8:30 a.m. ET, half an hour after the session opens. In BabyPips\' own measurements USD/CAD, a pair of two North American currencies, makes most of its typical daily range in New York hours.',
        ],
        [
          'The United States is the second-largest forex trading centre: US sales desks handled approximately 19% of global FX turnover in April 2025, after the United Kingdom\'s 38% (BIS Triennial Survey 2025). The session\'s first four hours are the ',
          OVERLAP_LINK,
          ', which BabyPips calls usually the busiest stretch of the trading day.',
        ],
      ],
    },
    {
      heading: 'The 17:00 close, Friday and Sydney',
      paragraphs: [
        [
          `The New York close at 17:00 ET is also where the forex trading day ends: most brokers roll open positions over to the next day then (BabyPips). On Friday it is the weekly close, and the retail market reopens at 17:00 ET on Sunday. In UK time the Friday close is ${c.close('newYork', LDN, 'winter')} for most of the year and ${c.close('newYork', LDN, 'usOnly')} in the weeks the US has changed and the UK has not.`,
        ],
        [
          `New York's afternoon can meet the next morning in Sydney. From ${c.dates('winter')} Sydney's session opens at ${c.open('sydney', NY, 'winter')} ET, so the two share ${hoursText(c.sharedHours('newYork', 'sydney', 'winter', true))}. While both the US and Sydney are on daylight time (${c.dates('usOnly', 'bothDst')}) Sydney opens at ${c.open('sydney', NY, 'usOnly')} ET, sharing ${hoursText(c.sharedHours('newYork', 'sydney', 'usOnly', true))}, and from ${c.dates('summer')} at ${c.open('sydney', NY, 'summer')} ET, as New York closes.`,
        ],
      ],
    },
  ],
  faq: (c) => [
    {
      question: 'What time does the New York session start in UK time?',
      answer: `At ${c.open('newYork', LDN, 'winter')} UK time, closing at ${c.close('newYork', LDN, 'winter')}, for most of the year. From ${c.dates('usOnly')} the US has changed its clocks and the UK has not, and the session runs ${c.at('newYork', LDN, 'usOnly')} UK time.`,
    },
    {
      question: 'What time is the New York session in EST, CST and PST?',
      answer: `08:00 to 17:00 Eastern time (EST in winter, EDT in summer), which is ${c.at('newYork', 'America/Chicago', 'winter')} Central and ${c.at('newYork', 'America/Los_Angeles', 'winter')} Pacific. All three US zones change their clocks on the same Sundays, so these hours hold all year.`,
    },
    {
      question: 'What time does the New York session open in India?',
      answer: `At ${c.open('newYork', IST, 'winter')} IST while New York is on standard time and ${c.open('newYork', IST, 'summer')} IST while it is on daylight time (${forward(c, NY)} to ${back(c, NY)}). It closes at ${c.close('newYork', IST, 'winter')} or ${c.close('newYork', IST, 'summer')} IST the next morning. India does not change its clocks, so only New York's changes move it.`,
    },
    {
      question: 'Why do some sites say New York opens at 9:30?',
      answer:
        'They mean the New York Stock Exchange, whose core trading session runs 9:30 a.m. to 4:00 p.m. ET. Forex is not traded on an exchange; the New York forex session is a convention for New York business hours, 08:00 to 17:00 ET.',
    },
    {
      question: 'What time does forex close on Friday?',
      answer: `At 17:00 New York time, the end of the New York session and of the retail trading week. That is ${c.close('newYork', 'UTC', 'winter')} UTC in winter and ${c.close('newYork', 'UTC', 'summer')} UTC while New York is on daylight time, or ${c.close('newYork', IST, 'winter')} and ${c.close('newYork', IST, 'summer')} IST on Saturday morning. Your broker sets its own closing time.`,
    },
  ],
  convention: 'New York hours here are 08:00–17:00 New York time, the convention BabyPips publishes for the city\'s working day.',
  journal: journal('The starter session list includes NY Open and NY PM, and the news-event list includes NFP Release, so trades around the jobs report can be compared with the rest;'),
  sources: [SRC.babypipsHours, SRC.babypipsNy, SRC.nyse, SRC.usCode, SRC.govUk, SRC.bls, SRC.bis, SRC.iana],
};

const LONDON: SessionPageContent = {
  id: 'london',
  path: SESSION_PATHS.london,
  crumb: 'London session',
  title: 'London forex session time in your time zone | TradeQut',
  description: 'The London forex session runs 08:00–17:00 UK time. Its open and close in EST, CST, PST, IST, Dubai, Lagos and more, with this year\'s UK and US clock changes.',
  h1: 'London forex session time',
  lede: 'When the London (European) session opens and closes on your clock, and how the UK changing its clocks on different Sundays from the US moves it in New York time.',
  today: [{ window: 'london', name: 'London session' }],
  table: { window: 'london', heading: 'London session times by time zone' },
  shortAnswer: (c) =>
    `By the usual convention the London session runs 08:00–17:00 London time: ${c.at('london', 'UTC', 'winter')} UTC while the UK is on GMT and ${c.at('london', 'UTC', 'summer')} UTC during British Summer Time. In New York that is ${c.at('london', NY, 'winter')} ET for most of the year, but ${c.at('london', NY, 'usOnly')} ET in the weeks the US has changed its clocks and the UK has not (${c.dates('usOnly')}). In India it is ${c.at('london', IST, 'winter')} IST in winter and ${c.at('london', IST, 'summer')} IST in summer.`,
  sections: (c) => [
    {
      heading: `UK clock changes in ${c.year}`,
      paragraphs: [
        [
          `UK clocks go forward an hour at 1:00 a.m. on the last Sunday in March and back an hour at 2:00 a.m. on the last Sunday in October (GOV.UK); in ${c.year} that is ${forward(c, LDN)} and ${back(c, LDN)}. The EU switches on the same last Sundays of March and October (European Commission, Directive 2000/84/EC), so in Berlin, Paris and Frankfurt the session is ${c.at('london', 'Europe/Berlin', 'winter')} all year.`,
        ],
        [
          `The US changes earlier in spring and later in autumn (${forward(c, NY)} and ${back(c, NY)}). From ${c.dates('usOnly')} London therefore opens at ${c.open('london', NY, 'usOnly')} ET instead of ${c.open('london', NY, 'winter')}, at ${c.open('london', 'America/Chicago', 'usOnly')} instead of ${c.open('london', 'America/Chicago', 'winter')} in Chicago and at ${c.open('london', 'America/Los_Angeles', 'usOnly')} instead of ${c.open('london', 'America/Los_Angeles', 'winter')} in Los Angeles. Outside those weeks the US and the UK move together and the session keeps the same US hours in summer and winter.`,
        ],
        [
          `Where clocks never change (${fixedNames(c)}), the London session moves an hour earlier from ${forward(c, LDN)} and back on ${back(c, LDN)}: in Lagos it is ${c.at('london', 'Africa/Lagos', 'winter')} in winter and ${c.at('london', 'Africa/Lagos', 'summer')} in summer, in Karachi ${c.at('london', 'Asia/Karachi', 'winter')} and ${c.at('london', 'Asia/Karachi', 'summer')}.`,
        ],
      ],
    },
    {
      heading: 'Why London is called the busiest session',
      paragraphs: [
        [
          'London is the largest forex trading centre. UK sales desks handled approximately 38% of global FX turnover in April 2025, about twice the US share of 19% (BIS Triennial Survey 2025). BabyPips says the London session usually has the most price movement of the day, and that it is also called the European session because Frankfurt, Zurich, Paris and the other European centres trade the same hours.',
        ],
      ],
    },
    {
      heading: 'Overlaps with Tokyo and New York',
      paragraphs: [
        [
          `Tokyo closes at 09:00 UTC all year, so the start of London shares ${hoursText(c.sharedHours('tokyo', 'london', 'winter'))} with Tokyo while the UK is on GMT and ${hoursText(c.sharedHours('tokyo', 'london', 'summer'))} during British Summer Time, when London opens at ${c.open('london', 'UTC', 'summer')} UTC.`,
        ],
        [
          `At the other end, London's last ${hoursText(c.hours('overlap', 'winter'))} (${c.at('overlap', LDN, 'winter')} UK time) overlap New York, and ${hoursText(c.hours('overlap', 'usOnly'))} (${c.at('overlap', LDN, 'usOnly')}) in the weeks the US has changed its clocks first. The `,
          OVERLAP_LINK,
          ' page has those hours for every zone.',
        ],
      ],
    },
  ],
  faq: (c) => [
    {
      question: 'What time is the London session in EST?',
      answer: `${c.at('london', NY, 'winter')} Eastern time for most of the year, in summer as in winter, because the US and the UK both move their clocks. In the weeks the US has changed and the UK has not (${c.dates('usOnly')}) it is ${c.at('london', NY, 'usOnly')} ET.`,
    },
    {
      question: 'What time is the London session in CST and PST?',
      answer: `${c.at('london', 'America/Chicago', 'winter')} Central time and ${c.at('london', 'America/Los_Angeles', 'winter')} Pacific time, an hour later (${c.at('london', 'America/Chicago', 'usOnly')} and ${c.at('london', 'America/Los_Angeles', 'usOnly')}) in the weeks US clocks have changed and UK clocks have not.`,
    },
    {
      question: 'What time does the London session open in India?',
      answer: `At ${c.open('london', IST, 'winter')} IST while the UK is on GMT and ${c.open('london', IST, 'summer')} IST during British Summer Time (${forward(c, LDN)} to ${back(c, LDN)}). It closes at ${c.close('london', IST, 'winter')} or ${c.close('london', IST, 'summer')} IST.`,
    },
    {
      question: 'Is the London session in GMT or BST?',
      answer: `It follows the UK clock: 08:00 to 17:00 GMT in winter and 08:00 to 17:00 BST in summer. Because BST is an hour ahead of GMT, the summer session is ${c.at('london', 'UTC', 'summer')} in UTC.`,
    },
    {
      question: 'What time is the London session in Dubai, Lagos and Johannesburg?',
      answer: `In winter ${c.at('london', 'Asia/Dubai', 'winter')} in Dubai, ${c.at('london', 'Africa/Lagos', 'winter')} in Lagos and ${c.at('london', 'Africa/Johannesburg', 'winter')} in Johannesburg; during British Summer Time an hour earlier: ${c.at('london', 'Asia/Dubai', 'summer')}, ${c.at('london', 'Africa/Lagos', 'summer')} and ${c.at('london', 'Africa/Johannesburg', 'summer')}. None of the three changes its clocks.`,
    },
  ],
  convention: 'London hours here are 08:00–17:00 London time, the convention BabyPips publishes for the city\'s working day.',
  journal: journal('The starter session list includes London Open and London Close, so early-London trades can be compared with afternoon ones;'),
  sources: [SRC.babypipsHours, SRC.babypipsLondon, SRC.govUk, SRC.euSummer, SRC.usCode, SRC.bis, SRC.iana],
};

const ASIAN: SessionPageContent = {
  id: 'asian',
  path: SESSION_PATHS.asian,
  crumb: 'Asian session',
  title: 'Asian session time (Tokyo) in your time zone | TradeQut',
  description: 'The Asian (Tokyo) forex session runs 09:00–18:00 Tokyo time, 00:00–09:00 UTC all year. Its hours in EST, PST, UK time, IST and more, plus the Sydney session.',
  h1: 'Asian forex session time (Tokyo)',
  lede: 'When the Asian session, which BabyPips treats as the Tokyo session, opens and closes on your clock, and how Sydney starts the trading week before it.',
  today: [
    { window: 'tokyo', name: 'Asian (Tokyo) session' },
    { window: 'sydney', name: 'Sydney session' },
  ],
  table: { window: 'tokyo', heading: 'Asian (Tokyo) session times by time zone' },
  shortAnswer: (c) =>
    `The Asian session is usually taken to be the Tokyo session: 09:00–18:00 Tokyo time, which is ${c.at('tokyo', 'UTC', 'winter')} UTC all year because Japan has no daylight saving. In New York it starts the evening before, at ${c.open('tokyo', NY, 'winter')} ET in winter and ${c.open('tokyo', NY, 'summer')} ET while the US is on daylight time. In UK time it is ${c.at('tokyo', LDN, 'winter')} in winter and ${c.at('tokyo', LDN, 'summer')} during British Summer Time, and in India ${c.at('tokyo', IST, 'winter')} IST all year.`,
  sections: (c) => [
    {
      heading: 'Tokyo has no daylight saving',
      paragraphs: [
        [
          `Japan does not change its clocks: the time-zone database has no change for Tokyo in ${c.year}. So the session never moves in UTC or anywhere else clocks stay put: ${fixedZones(c)
            .filter((z) => z.zone !== 'Asia/Tokyo')
            .map((z) => `${c.at('tokyo', z.zone, 'winter')} in ${shortName(z.name)}`)
            .join(', ')}.`,
        ],
        [
          `It moves for you only when your own clocks change: in the US on ${forward(c, NY)} and ${back(c, NY)}, in the UK and Europe on ${forward(c, LDN)} and ${back(c, LDN)}, and in Sydney, whose summer is the northern winter, on ${back(c, SYD)} and ${forward(c, SYD)}. In Sydney the session is ${c.at('tokyo', SYD, 'winter')} while Sydney is on daylight time (${c.dates('winter', 'usOnly', 'bothDst')}) and ${c.at('tokyo', SYD, 'summer')} from ${c.dates('summer')}.`,
        ],
      ],
    },
    {
      heading: 'Who trades in the Asian session',
      paragraphs: [
        [
          'BabyPips notes that the Tokyo session is also called the Asian session because Singapore and Hong Kong trade the same hours, and that yen pairs tend to be the most active pairs in it. More forex is traded in Singapore and Hong Kong than in Japan: Singapore\'s share of global FX turnover was 11.8% and Hong Kong\'s 7.0% in April 2025 (BIS Triennial Survey 2025). The survey\'s country table puts average daily turnover that month at about US$1,485 billion in Singapore, US$883 billion in Hong Kong and US$440 billion in Japan. The yen itself was on one side of 16.8% of all trades.',
        ],
      ],
    },
    {
      heading: 'Sydney opens the week',
      paragraphs: [
        [
          `The Sydney session (07:00–16:00 Sydney time) comes first. The weekly market opens at 17:00 New York time on Sunday, which is Monday ${c.weekOpen(SYD, 'winter')} in Sydney from ${c.dates('winter')}, ${c.weekOpen(SYD, 'usOnly')} while both the US and Sydney are on daylight time (${c.dates('usOnly', 'bothDst')}) and ${c.weekOpen(SYD, 'summer')} from ${c.dates('summer')}. Outside the southern winter, Sydney's Monday session therefore starts with the market, not at 07:00. In Tokyo the week opens at ${c.weekOpen('Asia/Tokyo', 'winter')} on Monday while the US is on standard time and ${c.weekOpen('Asia/Tokyo', 'summer')} while it is on daylight time, before the Tokyo session.`,
        ],
        [
          `BabyPips names Australian and New Zealand dollar pairs as the most active in the Sydney session, and gives AUD/JPY as a pair that trades more while Sydney and Tokyo are both open. The two overlap for ${hoursText(c.sharedHours('sydney', 'tokyo', 'winter'))} while Sydney is on daylight time (${c.open('tokyo', 'UTC', 'winter')}–${c.close('sydney', 'UTC', 'winter')} UTC) and ${hoursText(c.sharedHours('sydney', 'tokyo', 'summer'))} in the southern winter. Sydney's clocks change on its own Sundays (New South Wales publishes the dates), so its session has four arrangements a year:`,
        ],
      ],
      table: { window: 'sydney', heading: 'Sydney session times by time zone' },
    },
    {
      heading: 'Where Tokyo meets London',
      paragraphs: [
        [
          `Tokyo's last hours meet London's first: ${hoursText(c.sharedHours('tokyo', 'london', 'winter'))} while the UK is on GMT and ${hoursText(c.sharedHours('tokyo', 'london', 'summer'))} during British Summer Time, when London opens at ${c.open('london', 'UTC', 'summer')} UTC. For the London side see the `,
          { to: SESSION_PATHS.london, text: 'London session' },
          ' page.',
        ],
      ],
    },
  ],
  faq: (c) => [
    {
      question: 'What time does the Asian session start in EST?',
      answer: `At ${c.open('tokyo', NY, 'winter')} Eastern time the evening before (Tokyo's 09:00 is already the next morning) while the US is on standard time, and at ${c.open('tokyo', NY, 'summer')} ET while it is on daylight time. It ends at ${c.close('tokyo', NY, 'winter')} or ${c.close('tokyo', NY, 'summer')} ET.`,
    },
    {
      question: 'What time is the Asian session in UK time?',
      answer: `${c.at('tokyo', LDN, 'winter')} UK time while the UK is on GMT and ${c.at('tokyo', LDN, 'summer')} during British Summer Time. In UTC it is ${c.at('tokyo', 'UTC', 'winter')} all year.`,
    },
    {
      question: 'What time is the Tokyo session in India and Pakistan?',
      answer: `${c.at('tokyo', IST, 'winter')} IST in India and ${c.at('tokyo', 'Asia/Karachi', 'winter')} in Pakistan, all year: neither Japan, India nor Pakistan changes its clocks.`,
    },
    {
      question: 'Is the Asian session the same as the Sydney session?',
      answer: `No. In the convention used here the Asian session is the Tokyo session. Sydney's session (07:00–16:00 Sydney time) starts ${c.hours('sydney', 'summer') - c.sharedHours('sydney', 'tokyo', 'summer')} to ${c.hours('sydney', 'winter') - c.sharedHours('sydney', 'tokyo', 'winter')} hours before Tokyo's, depending on Sydney's daylight saving, and overlaps it for ${c.sharedHours('sydney', 'tokyo', 'winter')} to ${c.sharedHours('sydney', 'tokyo', 'summer')} hours.`,
    },
    {
      question: 'When does the forex week open in Asia?',
      answer: `At 17:00 New York time on Sunday, which is Monday ${c.weekOpen(SYD, 'winter')} in Sydney and ${c.weekOpen('Asia/Tokyo', 'winter')} in Tokyo in the northern winter, and Monday ${c.weekOpen(SYD, 'summer')} in Sydney and ${c.weekOpen('Asia/Tokyo', 'summer')} in Tokyo from ${c.dates('summer')}.`,
    },
  ],
  convention: 'Asian hours here are 09:00–18:00 Tokyo time and Sydney\'s 07:00–16:00 Sydney time, the convention BabyPips publishes.',
  journal: journal('The starter session list includes Asian, so trades placed in Asian hours can be compared with the rest;'),
  sources: [SRC.babypipsHours, SRC.babypipsTokyo, SRC.babypipsSydney, SRC.bis, SRC.bisAnnex, SRC.nsw, SRC.iana],
};

const OVERLAP: SessionPageContent = {
  id: 'overlap',
  path: SESSION_PATHS.overlap,
  crumb: 'London–New York overlap',
  title: 'London–New York overlap time in your time zone | TradeQut',
  description: 'London and New York overlap 08:00–12:00 New York time, 13:00–17:00 UK time, most of the year, and for five hours in a few weeks. The overlap in your zone.',
  h1: 'London–New York overlap time',
  lede: 'The hours when both the London and the New York sessions are open, on your clock, and the weeks each year when the overlap is an hour longer.',
  today: [{ window: 'overlap', name: 'London–New York overlap' }],
  table: { window: 'overlap', heading: 'London–New York overlap by time zone' },
  shortAnswer: (c) =>
    `The London and New York sessions overlap from 08:00 to 12:00 New York time, which is ${c.at('overlap', LDN, 'winter')} UK time, ${c.at('overlap', 'UTC', 'winter')} UTC in winter and ${c.at('overlap', 'UTC', 'summer')} UTC in summer. From ${c.dates('usOnly')} the US has changed its clocks and the UK has not, and the overlap runs ${hoursText(c.hours('overlap', 'usOnly'))}: ${c.at('overlap', NY, 'usOnly')} ET, ${c.at('overlap', LDN, 'usOnly')} UK time. In India it is ${c.at('overlap', IST, 'winter')} IST in winter and ${c.at('overlap', IST, 'summer')} IST in summer.`,
  sections: (c) => [
    {
      heading: `Why it is ${hoursText(c.hours('overlap', 'usOnly'))} in March and late October`,
      paragraphs: [
        [
          `The overlap is London's afternoon and New York's morning: it starts when New York opens (08:00 ET) and ends when London closes (17:00 UK time). The US moves its clocks forward on the second Sunday of March and back on the first Sunday of November (15 U.S.C. § 260a); the UK moves on the last Sundays of March and October (GOV.UK). In ${c.year} that leaves ${c.dates('usOnly')} with the US on daylight time and the UK on GMT.`,
        ],
        [
          `In those weeks New York opens an hour earlier on the UK clock (${c.open('overlap', LDN, 'usOnly')} instead of ${c.open('overlap', LDN, 'winter')}) while London still closes at 17:00, so the two share ${hoursText(c.hours('overlap', 'usOnly'))} instead of ${c.hours('overlap', 'winter')}. In India that is ${c.at('overlap', IST, 'usOnly')} IST, in Lagos ${c.at('overlap', 'Africa/Lagos', 'usOnly')} and in Manila ${c.at('overlap', 'Asia/Manila', 'usOnly')}, ending after midnight.`,
        ],
      ],
    },
    {
      heading: 'Why the overlap is called the busiest stretch',
      paragraphs: [
        [
          'BabyPips writes that the highest trading volume of the day occurs while London and New York are both open, and gives EUR/USD as a pair that trades more then. The BIS survey measures where trading is booked rather than when, but it shows how much of the market sits in these two centres: UK and US sales desks together handled more than half of global FX turnover in April 2025 (approximately 38% and 19%, BIS Triennial Survey 2025).',
        ],
      ],
    },
    {
      heading: 'The 4 p.m. London fix falls inside it',
      paragraphs: [
        [
          `The WMR closing spot rates, benchmark exchange rates run by LSEG, are fixed Monday to Friday at 4:00 p.m. London time: one hour before the overlap ends. That is ${c.clockAt(LDN, 16 * 60, NY, 'winter')} ET most of the year and ${c.clockAt(LDN, 16 * 60, NY, 'usOnly')} ET in the weeks the US has changed first, ${c.clockAt(LDN, 16 * 60, IST, 'winter')} IST in winter and ${c.clockAt(LDN, 16 * 60, IST, 'summer')} IST in summer, and ${c.clockAt(LDN, 16 * 60, 'Asia/Dubai', 'winter')} or ${c.clockAt(LDN, 16 * 60, 'Asia/Dubai', 'summer')} in Dubai.`,
        ],
      ],
    },
    {
      heading: 'The two sessions on their own',
      paragraphs: [
        [
          'Before the overlap London trades alone, and after it New York does. The ',
          { to: SESSION_PATHS.london, text: 'London session' },
          ' and ',
          { to: SESSION_PATHS.newYork, text: 'New York session' },
          ' pages give each one\'s full hours, its country\'s clock changes and what else happens in it.',
        ],
      ],
    },
  ],
  faq: (c) => [
    {
      question: 'What time is the London New York overlap in EST?',
      answer: `${c.at('overlap', NY, 'winter')} Eastern time for most of the year, in summer and in winter. From ${c.dates('usOnly')} it is ${c.at('overlap', NY, 'usOnly')} ET, because London, still on GMT, closes at ${c.close('london', NY, 'usOnly')} ET then.`,
    },
    {
      question: 'What time is the London and New York overlap in IST?',
      answer: `${c.at('overlap', IST, 'winter')} IST while the UK and the US are on standard time, ${c.at('overlap', IST, 'summer')} IST while both are on summer time, and ${c.at('overlap', IST, 'usOnly')} IST in the weeks the US has changed its clocks and the UK has not.`,
    },
    {
      question: 'How long is the London–New York overlap?',
      answer: `${hoursText(c.hours('overlap', 'winter'))} on most weekdays. In the weeks the US is on daylight time and the UK is not, ${c.dates('usOnly')}, it is ${hoursText(c.hours('overlap', 'usOnly'))}.`,
    },
    {
      question: 'What time does the overlap end in UK time?',
      answer: `At ${c.close('overlap', LDN, 'winter')} UK time all year, when the London session closes. Only its start moves: ${c.open('overlap', LDN, 'winter')} UK time for most of the year and ${c.open('overlap', LDN, 'usOnly')} in the weeks US clocks have changed and UK clocks have not.`,
    },
    {
      question: 'What time is the London New York overlap in Nigeria and South Africa?',
      answer: `${c.at('overlap', 'Africa/Lagos', 'winter')} in Lagos and ${c.at('overlap', 'Africa/Johannesburg', 'winter')} in Johannesburg in winter, an hour earlier during the northern summer (${c.at('overlap', 'Africa/Lagos', 'summer')} and ${c.at('overlap', 'Africa/Johannesburg', 'summer')}), and ${c.at('overlap', 'Africa/Lagos', 'usOnly')} and ${c.at('overlap', 'Africa/Johannesburg', 'usOnly')} in the weeks the US has changed and the UK has not.`,
    },
  ],
  convention: 'The overlap here is where London\'s 08:00–17:00 London time meets New York\'s 08:00–17:00 New York time, the convention BabyPips publishes.',
  journal: journal('The starter session list includes London/NY Overlap, so you can check whether your overlap trades really differ from the rest;'),
  sources: [SRC.babypipsHours, SRC.govUk, SRC.usCode, SRC.bis, SRC.lseg, SRC.iana],
};

export const SESSION_PAGES: Record<SessionPageId, SessionPageContent> = { newYork: NEW_YORK, london: LONDON, asian: ASIAN, overlap: OVERLAP };
