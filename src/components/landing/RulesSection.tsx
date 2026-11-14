import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Eyebrow } from '@/components/showcase/Eyebrow';
import { FigureCards, type FigureCard } from './FigureCards';

export const RULE_CARDS: FigureCard[] = [
  {
    question: 'Would that rule have helped?',
    answer:
      'Pick a rule, such as stop for the day after a loss or at most three trades a day, and the period is replayed without the trades it would have blocked. It only removes trades that happened, so it predicts nothing. Here, stopping after the first loss would have ended the sample month lower, and the replay says so.',
    caption: 'What-if replay',
    figure: 'whatIf',
  },
  {
    question: 'What is the one thing to work on?',
    answer:
      'The review gives a verdict that separates process from result, then the one behaviour that cost the most. When it comes with an if-then rule, you can make it your focus, and the next review counts how often you kept it and what the breaks cost. A review of the week is also made for you automatically.',
    caption: 'Weekly review',
    figure: 'review',
  },
  {
    question: 'Can I ask my own question?',
    answer:
      'Chat answers by running the same calculations as Analytics. The app draws the table from the result and the sentence reads it out, with the sample size beside it. It describes your own past trades and never suggests one.',
    caption: 'Chat',
    figure: 'chat',
  },
];

/** From a finding to a rule: the what-if replay, the weekly review's focus rule and chat that calculates. */
export function RulesSection() {
  return (
    <section id="rules" aria-labelledby="rules-heading" className="lp-rules lp-rule">
      <div className="lp-wrap">
        <div className="lp-head">
          <div>
            <Eyebrow>From a finding to a rule</Eyebrow>
            <h2 id="rules-heading" className="lp-h2">
              One rule a week.
              <br />
              <span className="lp-muted-line">Then: did you keep it?</span>
            </h2>
          </div>
          <p>In the review and in chat a model writes the sentences. The figures are calculated by code, never by the model.</p>
        </div>
        <FigureCards items={RULE_CARDS} first={4} />
        <p className="lp-rules__more">
          <Link to="/pricing#analytics" className="lp-link">
            Every Analytics tab and the question it answers
            <ArrowRight aria-hidden="true" />
          </Link>
        </p>
      </div>
    </section>
  );
}
