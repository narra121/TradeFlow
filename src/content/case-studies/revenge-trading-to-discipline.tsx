import { Link } from 'react-router-dom';

export default function RevengeTradingToDiscipline() {
  return (
    <>
      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">The Pattern</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Alex had been swing trading crypto for about 18 months, primarily on BTC/USDT, ETH/USDT, and
        SOL/USDT using 4-hour and daily charts. He had a solid understanding of support and
        resistance, used Fibonacci retracements for entries, and sized positions at 2% of his $15,000
        portfolio. On paper, it should have worked.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        In practice, Alex had a recurring problem. Every time he took a loss, he immediately opened
        another position &mdash; usually in the same direction, often with a wider stop or no stop at
        all. He called it &quot;averaging in.&quot; His journal later revealed it for what it was:{' '}
        <Link to="/glossary" className="text-primary hover:underline">revenge trading</Link>.
        A $300 loss would become a $900 loss within an hour as he doubled and tripled down trying to
        recover.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">The Data</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        After four months of journaling, Alex tagged every trade with an emotional state: calm,
        anxious, frustrated, or revenge. He also added a field for whether the trade was planned
        (part of his morning watchlist) or reactive (opened in response to a losing trade).
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The numbers were brutal. Of his 210 trades over four months, 63 (30%) were tagged as
        &quot;revenge&quot; or &quot;reactive.&quot; Those 63 trades had a 24% win rate and accounted
        for 70% of his total dollar losses. His planned, calm-state trades had a respectable 54% win
        rate with a 2.1:1 reward-to-risk ratio. He was not a bad trader &mdash; he just could not
        stop himself from undoing his good work after every losing trade.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">The Fix</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Alex implemented two changes based on the journal data:
      </p>
      <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4 ml-4">
        <li>
          <span className="font-medium text-foreground">Emotional state logging before entry.</span>{' '}
          Before opening any position, he selected his current emotional state from a dropdown.
          If it was anything other than &quot;calm,&quot; the entry served as a warning. He created
          a{' '}
          <Link to="/glossary" className="text-primary hover:underline">trading rule</Link>{' '}
          in his journal: &quot;No trades when emotional state is frustrated or revenge.&quot;
        </li>
        <li>
          <span className="font-medium text-foreground">Mandatory 2-hour cooling-off period.</span>{' '}
          After any loss exceeding 1.5% of his portfolio, he set a timer and closed the charting
          platform. No charts, no order book, no price alerts for two full hours. He logged the
          start and end time in his journal to hold himself accountable.
        </li>
      </ul>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The first week was difficult. On three occasions he found himself reaching for his phone to
        check prices during the cooling-off period. He logged those moments too &mdash; building a
        record of how strong the impulse was and how it faded over time.
      </p>

      <div className="bg-card rounded-xl border border-border/50 p-6 my-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Results at a Glance</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Revenge Trades</p>
            <p className="text-lg font-semibold text-foreground">30% &rarr; 5%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Overall Win Rate</p>
            <p className="text-lg font-semibold text-foreground">41% &rarr; 53%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Monthly P&L</p>
            <p className="text-lg font-semibold text-foreground">-$620 &rarr; +$890</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Max Drawdown</p>
            <p className="text-lg font-semibold text-foreground">18% &rarr; 7%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Trades/Month</p>
            <p className="text-lg font-semibold text-foreground">53 &rarr; 34</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Profit Factor</p>
            <p className="text-lg font-semibold text-foreground">0.7 &rarr; 1.5</p>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">The Results</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Over the following four months, Alex's revenge trade percentage dropped from 30% to 5%.
        Those remaining 5% happened during the first two weeks before the cooling-off habit fully
        formed. By month three, he had gone 28 consecutive trading days without a single revenge
        trade.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        His overall win rate climbed from 41% to 53% simply because he was no longer diluting his
        performance with low-probability emotional trades. His maximum drawdown dropped from 18% to
        7%, and for the first time in his trading career, he strung together four consecutive
        profitable months. His portfolio grew from $15,000 to $18,400 &mdash; a 22.7% gain over
        four months.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Key Takeaway</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Revenge trading is not a strategy problem &mdash; it is a behavioral one. Alex already had
        the technical skill to trade profitably. What he needed was a feedback mechanism that made the
        emotional pattern visible and a concrete rule that interrupted it. The journal provided
        both: the data to prove the problem existed and the accountability structure to enforce the
        fix. Most traders know revenge trading is destructive. The difference is having a system that
        prevents it from happening, not just advice that says it should not.
      </p>
    </>
  );
}
