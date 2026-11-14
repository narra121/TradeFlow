export interface AnalyticsTab {
  tab: string;
  /** The question the tab answers, in the app's own words. */
  question: string;
  shows: string;
}

/** What Analytics holds, tab by tab, as built in src/components/analysis/*Tab.tsx: change both together. */
export const ANALYTICS_TABS: AnalyticsTab[] = [
  {
    tab: 'Overview',
    question: 'Do I have an edge, and is it holding?',
    shows: 'Win rate against the break-even win rate and expectancy in R, each with its range and a sample label; expectancy over the last 20 trades; where the result came from; how much rests on a few trades.',
  },
  {
    tab: 'Edge',
    question: 'What should I trade more of, and less of?',
    shows: 'Results by symbol, strategy, session, weekday, hour, tag and more, with the evidence beside each row, a second “then by” level, and this period against the one before.',
  },
  { tab: 'Timing', question: 'When should I trade, and when should I stop?', shows: 'Weekday and hour, trade number in the day, trades per day and holding time of winners against losers.' },
  { tab: 'Risk', question: 'Is my risk under control?', shows: 'Losses past the stop, planned against captured R, risk per trade, drawdown, and from 50 trades a next-100-trades scenario.' },
  {
    tab: 'Behaviour',
    question: 'What do I do that costs money?',
    shows: 'Checks on every trade, such as re-entry within 15 minutes of a loss, each with its count, net P&L and R against your other trades; the cost of each mistake and broken rule; a what-if replay of a rule.',
  },
  { tab: 'Tax', question: 'What did trading cost in charges, and what is the year’s profit by category?', shows: 'For accounts in rupees, one Indian financial year: charges split by type and P&L by tax category. Not tax advice.' },
];

/** The Analytics tabs with the question each answers, for the pricing page. */
export function AnalyticsContents() {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full table-fixed text-xs sm:text-sm">
        <caption className="sr-only">What each Analytics tab shows</caption>
        <thead className="bg-muted">
          <tr>
            <th scope="col" className="w-[38%] px-2 py-3 text-left font-semibold text-foreground sm:w-1/3 sm:px-4">
              Tab and its question
            </th>
            <th scope="col" className="px-2 py-3 text-left font-semibold text-foreground sm:px-4">
              What it shows
            </th>
          </tr>
        </thead>
        <tbody>
          {ANALYTICS_TABS.map((row) => (
            <tr key={row.tab} className="border-t border-border align-top">
              <th scope="row" className="px-2 py-3 text-left font-normal sm:px-4">
                <span className="block font-medium text-foreground">{row.tab}</span>{' '}
                <span className="block text-foreground-soft">{row.question}</span>
              </th>
              <td className="px-2 py-3 text-foreground-soft sm:px-4">{row.shows}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
