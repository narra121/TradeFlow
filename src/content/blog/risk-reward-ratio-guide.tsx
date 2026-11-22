import { formatPercent, formatR } from '@/lib/format';
import { RATIO_TABLE, breakEvenAtRatioPct, resultPerTradeR } from '@/lib/riskReward';
import { A, Disclaimer, H2, OL, P, Table, UL } from '../components/ArticleParts';

const CALCULATOR = '/resources/risk-reward';
const WIN_RATES = [30, 40, 50] as const;

export default function RiskRewardRatioGuide() {
  return (
    <>
      <H2>What is the risk-reward ratio?</H2>
      <P>
        The risk-reward ratio compares what a trade loses if its stop loss is hit with what it makes if its take profit is hit. It is written risk :
        reward with the risk counted as 1, so a trade that risks 5 to make 15 has a risk-reward ratio of 1 : 3.
      </P>
      <div className="mb-6 space-y-1 rounded-lg border border-border bg-card p-4 text-center font-mono text-sm text-foreground">
        <p>
          Long: <span className="whitespace-nowrap">risk = entry − stop loss,</span> <span className="whitespace-nowrap">reward = take profit − entry</span>
        </p>
        <p>
          Short: <span className="whitespace-nowrap">risk = stop loss − entry,</span> <span className="whitespace-nowrap">reward = entry − take profit</span>
        </p>
        <p>
          Risk-reward ratio = <span className="whitespace-nowrap">risk : reward</span> <span className="whitespace-nowrap">= 1 : (reward ÷ risk)</span>
        </p>
      </div>
      <P>
        The <A to={CALCULATOR}>risk-reward calculator</A> does this from three prices, for a long or a short trade, and shows the win rate the ratio needs
        to break even.
      </P>
      <P>
        Risk to reward, reward to risk, R:R and RRR all name the same comparison. 1 : 3 risk to reward is 3 : 1 reward to risk, and a 3R target makes
        three times the amount at risk. Quoted as a single number it can go either way: risk ÷ reward = 0.33, where a smaller number means more reward for
        each unit of risk, or reward ÷ risk = 3, where a larger one does. Check which way round a ratio is written before comparing two.
      </P>

      <H2>How to calculate risk-reward ratio</H2>
      <P>A hypothetical long trade: buy 100 units at 250, stop loss at 242, take profit at 270.</P>
      <OL>
        <li>
          <strong className="text-foreground">Measure the risk.</strong> Entry − stop loss = 250 − 242 = 8 per unit. For a short trade it is stop loss −
          entry.
        </li>
        <li>
          <strong className="text-foreground">Measure the reward.</strong> Take profit − entry = 270 − 250 = 20 per unit. For a short trade it is entry −
          take profit.
        </li>
        <li>
          <strong className="text-foreground">Divide the reward by the risk.</strong> 20 ÷ 8 = 2.5, so the risk-reward ratio is 1 : 2.5.
        </li>
        <li>
          <strong className="text-foreground">Find the break-even win rate.</strong> 1 ÷ (1 + 2.5) = 28.6%: trades like this pay for their losses when more
          than 28.6% of them reach the target, before costs.
        </li>
        <li>
          <strong className="text-foreground">Convert it to money.</strong> Multiply both distances by the position size: 100 units risk 800 to make
          2,000. The ratio stays 1 : 2.5 at any size.
        </li>
      </OL>
      <P>
        A short works the same way with the levels flipped. Sell EUR/USD at 1.2650 with a stop at 1.2700 and a target at 1.2500: the risk is 1.2700 −
        1.2650 = 0.0050, the reward 1.2650 − 1.2500 = 0.0150, and the ratio 1 : 3. To try your own prices, enter them in the{' '}
        <A to={CALCULATOR}>risk-reward calculator</A>.
      </P>

      <H2>Risk-reward ratio and win rate</H2>
      <P>
        The ratio alone does not say whether trades make money; the win rate decides that. At 1 : 2 one win pays for two losses, so trades break even
        when one in three wins. Over 100 trades risking 100 each, 34 winners make 34 × 200 = 6,800 and 66 losers cost 66 × 100 = 6,600.
      </P>
      <P>
        In general the break-even win rate is risk ÷ (risk + reward), which is 1 ÷ (1 + reward ÷ risk). The table gives it from 1 : 0.5 to 1 : 5, with the
        average result per trade in R (multiples of the amount at risk) at three win rates: win rate × reward ÷ risk − loss rate.
      </P>
      <Table
        caption="Break-even win rate, and result per trade in R at three win rates, by risk-reward ratio, before costs"
        head={['Risk : reward', 'Win rate to break even', ...WIN_RATES.map((w) => `At ${w}% wins`)]}
        rows={RATIO_TABLE.map((rr) => [`1 : ${rr}`, formatPercent(breakEvenAtRatioPct(rr), 1), ...WIN_RATES.map((w) => formatR(resultPerTradeR(rr, w)))])}
      />
      <P>
        Along a row the same ratio loses at one win rate and makes money at another: 1 : 2 loses 0.10R a trade at 30% wins and makes 0.20R at 40%. Which
        combination a strategy has comes from its own closed trades. <A to="/blog/win-rate-vs-profit-factor">Win rate vs profit factor</A> explains why
        neither number means much alone, and the <A to="/resources/expectancy-calculator">expectancy calculator</A> adds costs.
      </P>

      <H2 id="probability">Risk-reward ratio and probability</H2>
      <P>
        A target further away raises the ratio, but price has further to travel to reach it, so fewer trades get there. The ratio and the chance of
        reaching the target move together. In a simple model where price moves randomly with no drift, each trade&apos;s expected result is zero, so
        p × reward − (1 − p) × risk = 0, and the chance p of reaching the target before the stop is risk ÷ (risk + reward): exactly the break-even win
        rate. In that model every ratio breaks even before costs, and costs make every ratio lose.
      </P>
      <P>
        So a ratio does not create an edge; a win rate above the break-even for the ratio traded does. A 1 : 5 target reached on 15% of trades loses
        0.10R a trade, because it needs 16.7%, while a 1 : 1 target reached on 55% of trades makes 0.10R a trade, both before costs.
      </P>

      <H2>Risk-reward ratio and position size</H2>
      <P>
        The ratio is per unit of price, so it does not change with size; the money at risk does. Fixed-risk sizing chooses the money first and works back
        to the size. With a 50,000 account and 1% (500) at risk on a trade, as an example, a stop 5 away allows 500 ÷ 5 = 100 units and a stop 2 away
        allows 500 ÷ 2 = 250. The stop distance sets the size; the target sets the ratio. The{' '}
        <A to="/resources/position-size">position size calculator</A> works out the size, and{' '}
        <A to="/blog/position-sizing-fixed-risk">fixed-risk position sizing</A> explains the method.
      </P>

      <H2>Common risk-reward mistakes</H2>
      <UL>
        <li>
          <strong className="text-foreground">Moving the stop further away.</strong> Doubling the stop distance on a 1 : 3 trade makes it 1 : 1.5, and the
          break-even win rate rises from 25% to 40%.
        </li>
        <li>
          <strong className="text-foreground">Taking profit early.</strong> Closing a planned 1 : 3 trade at 1 : 1.5 halves the win. Done often, it cuts
          the average win and the <A to="/glossary/profit-factor">profit factor</A> with it.
        </li>
        <li>
          <strong className="text-foreground">Leaving out costs.</strong> With a risk of 100, a reward of 150 and 10 of costs a round trip, a win nets 140
          and a loss costs 110. That is 1 : 1.27 after costs, and the break-even rises from 40% to (100 + 10) ÷ (150 + 100) = 44%.
        </li>
        <li>
          <strong className="text-foreground">Quoting a target the market seldom reaches.</strong> A far target makes the ratio look good on paper; what
          counts is how often trades like it get there.
        </li>
        <li>
          <strong className="text-foreground">Losses past the stop.</strong> A gap or slippage through the stop turns a planned −1R into −1.3R or worse,
          and the real ratio with it. <A to="/blog/r-multiple-explained">R multiples</A> show it trade by trade.
        </li>
      </UL>

      <H2>Tracking planned and actual risk-reward</H2>
      <P>
        Record the planned ratio before the entry and the result at the exit. The planned ratio comes from the stop and the target; the actual one from
        where the trade closed. If trades planned at 1 : 3 average +1.8R when they win, winners are being closed early; losses beyond −1R mean the stop
        was moved, gapped through or slipped.
      </P>
      <P>
        In TradeQut the trade list shows the R each trade realised, from its entry, exit and stop, and can add a Planned R:R column from its stop and
        target. The Risk tab in Analytics compares the planned R of winning trades with the R they captured, counts how many reached the target, and
        lists losing trades that ended past the stop. <A to="/blog/track-reduce-drawdown">Drawdown tracking</A> shows what the losing runs cost.
      </P>
      <Disclaimer />
    </>
  );
}
