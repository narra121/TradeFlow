import { useId, useState } from 'react';
import { Plus } from 'lucide-react';
import { Eyebrow } from '@/components/showcase/Eyebrow';
import type { FaqItem } from '@/content/product-facts';

/** Forma's FAQ as the WAI-ARIA accordion: each question is a heading holding a button; answers stay in the HTML. */
export function LandingFaq({ items }: { items: FaqItem[] }) {
  const base = useId();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="lp-faq lp-rule" aria-labelledby="faq-heading">
      <div className="lp-wrap lp-faq__grid">
        <div>
          <Eyebrow>Before you start</Eyebrow>
          <h2 id="faq-heading" className="lp-h2">
            Questions.
            <br />
            <span className="lp-muted-line">Straight answers.</span>
          </h2>
        </div>
        <div className="lp-faq__list">
          {items.map((f, i) => {
            const id = `${base}-${i}`;
            const expanded = open === i;
            return (
              <div key={f.question} className="lp-faq__item">
                <h3>
                  <button type="button" className="lp-faq__btn" aria-expanded={expanded} aria-controls={`${id}-a`} id={`${id}-q`} onClick={() => setOpen(expanded ? null : i)}>
                    {f.question}
                    <Plus aria-hidden="true" />
                  </button>
                </h3>
                <div id={`${id}-a`} className="lp-faq__answer" hidden={!expanded}>
                  {f.answer}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
