import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { SampleDataChip } from '@/components/showcase/SampleDataChip';
import type { FigureId } from '@/components/showcase/figures';
import { useInView, useLandingMotion } from './motion';

const Figure = lazy(() => import('@/components/showcase/figures'));

export interface FigureCard {
  /** The trader's question, as the card's heading. */
  question: string;
  answer: string;
  /** The screen or panel the picture shows, e.g. `Weekly review`; short enough for one caption line. */
  caption: string;
  figure: FigureId;
}

/** How far below the screen a row may be when its pictures start loading. */
const LOAD_AHEAD = '1200px';

/**
 * A row of product pictures, each over the question it answers. `first` is the number of the first figure. The pictures
 * are a chunk of their own, fetched when the row comes near the screen, so they are in neither the first load nor the
 * prerendered HTML; until they arrive each holds its place at the stage's 380 × 360 shape, so nothing moves.
 */
export function FigureCards({ items, first = 1 }: { items: readonly FigureCard[]; first?: number }) {
  const { still } = useLandingMotion();
  const list = useRef<HTMLUListElement>(null);
  const near = useInView(list, LOAD_AHEAD);
  const [wanted, setWanted] = useState(false);
  useEffect(() => {
    if (near) setWanted(true);
  }, [near]);
  const hold = <div className="lp-card__hold" aria-hidden="true" />;
  return (
    <ul ref={list} className="lp-cards">
      {items.map(({ question, answer, caption, figure }, i) => (
        <li key={question} className="lp-card">
          <figure className="lp-card__art">
            <figcaption>
              <span>
                Fig. {String(first + i).padStart(2, '0')} · {caption}
              </span>
              <SampleDataChip />
            </figcaption>
            {wanted ? (
              <Suspense fallback={hold}>
                <Figure id={figure} play={!still} />
              </Suspense>
            ) : (
              hold
            )}
          </figure>
          <h3>{question}</h3>
          <p>{answer}</p>
        </li>
      ))}
    </ul>
  );
}
