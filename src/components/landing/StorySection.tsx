import { useRef, useState } from 'react';
import { Eyebrow } from '@/components/showcase/Eyebrow';
import { DashboardStage } from '@/components/showcase/DashboardStage';
import { SampleDataChip } from '@/components/showcase/SampleDataChip';
import { DASHBOARD_ALT } from '@/components/showcase/sampleJournal';
import { scrollToProgress, stickyProgress, useLandingMotion, useScrollFrame } from './motion';

const STEPS = [
  {
    tag: 'Import',
    title: 'Import the file',
    body: 'Upload the MetaTrader report or the Zerodha, Dhan, Upstox, Angel One or Groww file, check the rows in the review step and save. Duplicates are skipped.',
    focus: 'net',
  },
  {
    tag: 'Journal',
    title: 'Mark what went wrong',
    body: 'Tag the mistake and mark the rule a trade broke. Notes, tags and screenshots stay on the trade.',
    focus: 'rules',
  },
  {
    tag: 'Review',
    title: 'Read the month',
    body: 'Net P&L, win rate, best day and the cost of broken rules, for the account and month you choose.',
    focus: 'month',
  },
] as const;

/** Forma's story: three chapters on the left follow the scroll; the window on the right changes with them. */
export function StorySection() {
  const { still } = useLandingMotion();
  const section = useRef<HTMLElement>(null);
  const sticky = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [tilt, setTilt] = useState(0);

  useScrollFrame(() => {
    if (!section.current || !sticky.current) return;
    const desktop = window.matchMedia('(min-width: 1024px)').matches;
    if (still || !desktop) return setTilt(0);
    const rect = section.current.getBoundingClientRect();
    if (rect.top >= window.innerHeight || rect.bottom <= 0) return;
    const p = stickyProgress(section.current, sticky.current);
    setStep(Math.min(2, Math.floor(p * 3)));
    setTilt(Math.max(0, 10 - p * 37));
  }, [still]);

  const choose = (i: number) => {
    setStep(i);
    const desktop = window.matchMedia('(min-width: 1024px)').matches;
    if (!still && desktop && section.current && sticky.current) scrollToProgress(section.current, sticky.current, (i + 0.25) / 3);
  };

  return (
    <section ref={section} id="product" className="lp-story lp-rule" aria-labelledby="story-heading">
      <div ref={sticky} className="lp-story__sticky">
        <div className="lp-wrap">
          <div className="lp-story__head">
            <div>
              <Eyebrow>From the trade to the month</Eyebrow>
              <h2 id="story-heading" className="lp-h2">
                One trade at a time.
                <br />
                <span className="lp-muted-line">One month at a glance.</span>
              </h2>
            </div>
            <p className="lp-story__count" aria-hidden="true">
              <b>0{step + 1}</b> — 03
            </p>
          </div>
          <div className="lp-story__grid">
            <ol className="lp-story__steps">
              {STEPS.map((s, i) => (
                <li key={s.tag}>
                  <button type="button" className="lp-story__step" aria-pressed={i === step} onClick={() => choose(i)}>
                    <small>
                      0{i + 1} / {s.tag}
                    </small>
                    <strong>{s.title}</strong>
                    <span>{s.body}</span>
                  </button>
                </li>
              ))}
            </ol>
            <figure className="lp-story__window">
              <figcaption className="lp-figcap">
                <SampleDataChip />
                November 2026 on the dashboard
              </figcaption>
              <div className="lp-story__tilt" style={{ ['--tilt' as string]: `${tilt}deg` }} role="img" aria-label={DASHBOARD_ALT}>
                <div aria-hidden="true">
                  <DashboardStage focus={STEPS[step].focus} />
                </div>
              </div>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}
