import { Eyebrow } from '@/components/showcase/Eyebrow';
import { FigureCards, type FigureCard } from './FigureCards';

export const ANSWERS: FigureCard[] = [
  {
    question: 'What did each trade really make?',
    answer:
      'Import the MetaTrader 4 or 5 report, or the Zerodha, Dhan, Upstox, Angel One or Groww file, and review it before saving. MetaTrader commission and swap go into the fees, and Indian broker trades get estimated charges (the trade date’s rates for NSE trades from 1 October 2024; older exchange charges are approximations), so P&L is net.',
    caption: 'Import review',
    figure: 'import',
  },
  {
    question: 'Do I have an edge, or one good month?',
    answer:
      'From 20 trades, win rate and expectancy in R each show a 95% range, and the sample is labelled early, provisional or established. While the expectancy range still includes zero, Analytics says “not proven yet” and estimates how many trades it would take.',
    caption: 'Overview',
    figure: 'edge',
  },
  {
    question: 'Which habits cost money, even untagged?',
    answer:
      'Analytics checks every trade against a fixed list of behaviours, such as a new trade within 15 minutes of a loss or a loss that ran past the stop. Each gets a count, its net P&L and its average R against your other trades. Under 30 trades it reads “too early to tell”, never “leak”.',
    caption: 'Behaviour',
    figure: 'behaviour',
  },
];

export function AnswersSection() {
  return (
    <section id="answers" aria-labelledby="answers-heading" className="lp-answers lp-wrap">
      <div className="lp-head">
        <div>
          <Eyebrow>Three questions, your own numbers</Eyebrow>
          <h2 id="answers-heading" className="lp-h2">
            What TradeQut answers
          </h2>
        </div>
        <p>Every figure comes from your trades. The pictures use one sample account of 29 trades, so they show what the app says when it is too early to tell.</p>
      </div>
      <FigureCards items={ANSWERS} />
    </section>
  );
}
