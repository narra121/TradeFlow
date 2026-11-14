import type { ComponentType } from 'react';
import { BEHAVIOUR_ALT, BehaviourBoardCard, EDGE_ALT, EdgeCard, ImportReviewDemo } from './AnswerCards';
import { CHAT_ALT, ChatAnswerDemo, REVIEW_ALT, WHATIF_ALT, WeeklyReviewDemo, WhatIfDemo } from './RuleCards';

/** A showcase visual with its text alternative; animated ones take `play`, stills ignore it. */
const FIGURES = {
  import: {
    Visual: ImportReviewDemo,
    alt: 'Sample data: a Zerodha tradebook in the import review, two NIFTY and BANKNIFTY option trades with their estimated charges and net P&L, one duplicate skipped.',
  },
  edge: { Visual: EdgeCard, alt: EDGE_ALT },
  behaviour: { Visual: BehaviourBoardCard, alt: BEHAVIOUR_ALT },
  whatIf: { Visual: WhatIfDemo, alt: WHATIF_ALT },
  review: { Visual: WeeklyReviewDemo, alt: REVIEW_ALT },
  chat: { Visual: ChatAnswerDemo, alt: CHAT_ALT },
} satisfies Record<string, { Visual: ComponentType<{ play?: boolean }>; alt: string }>;

export type FigureId = keyof typeof FIGURES;

/**
 * One card picture as an image with its label. The landing page loads this module as its own chunk after first paint,
 * so nothing outside the card pictures may import it statically.
 */
export default function Figure({ id, play }: { id: FigureId; play: boolean }) {
  const { Visual, alt } = FIGURES[id];
  return (
    <div role="img" aria-label={alt}>
      <div aria-hidden="true">
        <Visual play={play} />
      </div>
    </div>
  );
}
