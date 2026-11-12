import { useRef, useState } from 'react';
import { Eyebrow } from '@/components/showcase/Eyebrow';
import { useLandingMotion, useScrollFrame } from './motion';

const LEAD = 'TradeQut shows what your trading habits and broken rules cost you, in your own numbers,';
const TAIL = 'net of fees.';
const WORDS = [...LEAD.split(' ').map((w) => ({ w, em: false })), ...TAIL.split(' ').map((w) => ({ w, em: true }))];

/** Forma's manifesto: the promise lights up word by word as it scrolls into the middle of the screen. */
export function Manifesto() {
  const { still } = useLandingMotion();
  const ref = useRef<HTMLParagraphElement>(null);
  const [lit, setLit] = useState(WORDS.length);
  useScrollFrame(() => {
    if (still || !ref.current) return setLit(WORDS.length);
    const r = ref.current.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (window.innerHeight * 0.83 - r.top) / (window.innerHeight * 0.57)));
    setLit(Math.round(p * WORDS.length));
  }, [still]);
  return (
    <section className="lp-manifesto lp-rule" aria-labelledby="promise-label">
      <div className="lp-wrap lp-manifesto__grid">
        <Eyebrow>
          <span id="promise-label">The promise</span>
        </Eyebrow>
        <p ref={ref} className="lp-manifesto__text">
          {WORDS.map((x, i) => (
            <span key={i}>
              <span className={`lp-word${x.em ? ' lp-word--em' : ''}`} data-lit={i < lit}>
                {x.w}
              </span>{' '}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
