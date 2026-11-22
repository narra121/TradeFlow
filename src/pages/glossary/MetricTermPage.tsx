import type { ComponentType } from 'react';
import { ContentPageShell } from '@/components/content/ContentPageShell';
import { A, Crumbs, Disclaimer, Faq, H2, H3, P, SignupCta, Table, UL } from '@/content/components/ArticleParts';
import { pageTitle } from '@/config/seo';
import { GLOSSARY_PARENT, METRIC_TERMS, getMetricTerm, metricTermSchema, type MetricTermId } from '@/content/glossary/metrics';
import { ExpectancyTermCalculator, MaxDrawdownCalculator, ProfitFactorCalculator, RMultipleCalculator, WinRateCalculator } from './TermCalculators';

const CALCULATORS: Record<MetricTermId, ComponentType> = {
  'profit-factor': ProfitFactorCalculator,
  expectancy: ExpectancyTermCalculator,
  'r-multiple': RMultipleCalculator,
  'win-rate': WinRateCalculator,
  'maximum-drawdown': MaxDrawdownCalculator,
};

/** One layout for the five metric term pages: definition, formula, worked example, calculator, reading, mistakes, links, FAQ. */
export function MetricTermPage({ id }: { id: MetricTermId }) {
  const t = getMetricTerm(id);
  const title = pageTitle(t.title, ' | TradeQut');
  const Calculator = CALCULATORS[id];
  const siblings = METRIC_TERMS.filter((x) => x.id !== id);

  return (
    <ContentPageShell title={title} description={t.description} path={t.path} jsonLd={metricTermSchema(t, title)} maxWidth="max-w-5xl">
      <Crumbs parent={GLOSSARY_PARENT} current={t.name} />
      <h1 className="mb-4 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">{t.name}</h1>

      <div className="max-w-[72ch]">
        <p data-testid="term-definition" className="mb-8 text-base leading-relaxed text-foreground">
          {t.definition}
        </p>

        <H2 id="formula">{t.name} formula</H2>
        <P>{t.formula.words}</P>
        <div className="mb-4 space-y-1 rounded-lg border border-border bg-card p-4 font-mono text-sm text-foreground" data-testid="term-formula">
          {t.formula.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <P>{t.formula.key}</P>

        <H2 id="example">{t.example.heading}</H2>
        <P>{t.example.intro}</P>
        <Table caption={t.example.caption} head={t.example.head} rows={t.example.rows} />
        <ul className="num mb-4 space-y-1 rounded-lg border border-border bg-card p-4 text-sm text-foreground">
          {t.example.working.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
        <P>{t.example.after}</P>
      </div>

      <section aria-labelledby="calculator">
        <H2 id="calculator">{t.name} calculator</H2>
        <p className="mb-6 max-w-[72ch] leading-relaxed text-muted-foreground">{t.calculator.intro}</p>
        <Calculator />
        <p className="-mt-6 mb-10 max-w-[72ch] text-sm leading-relaxed text-muted-foreground">
          <strong className="text-foreground">What it does not cover.</strong> {t.calculator.limits}
        </p>
      </section>

      <div className="max-w-[72ch]">
        <H2 id="reading">How to read {t.inText}</H2>
        <P>{t.reading}</P>
        <H3>What it does not show</H3>
        <UL>
          {t.hides.map((h) => (
            <li key={h.lead}>
              <strong className="text-foreground">{h.lead}</strong> {h.text}
            </li>
          ))}
        </UL>

        <H2 id="mistakes">Mistakes when calculating {t.inText}</H2>
        <UL>
          {t.mistakes.map((m) => (
            <li key={m.lead}>
              <strong className="text-foreground">{m.lead}</strong> {m.text}
            </li>
          ))}
        </UL>

        <H2 id="related">Related articles and tools</H2>
        <P>{t.deeper}</P>
        <P>{t.inJournal}</P>

        <Faq items={t.faq} />

        <nav aria-labelledby="other-metrics" className="mt-10">
          <h2 id="other-metrics" className="mb-3 text-base font-semibold text-foreground">
            Other metrics in the glossary
          </h2>
          <UL>
            {siblings.map((s) => (
              <li key={s.id}>
                <A to={s.path}>{s.name}</A>
              </li>
            ))}
            <li>
              <A to={GLOSSARY_PARENT.path}>All trading terms</A>
            </li>
          </UL>
        </nav>

        <Disclaimer>
          Educational page with hypothetical numbers. The calculator does arithmetic on the numbers you enter and does not forecast results. TradeQut is a
          journaling and analytics tool, not an investment adviser in any country (in India, not a SEBI-registered investment adviser), and nothing here
          is a recommendation to buy or sell any security or currency.
        </Disclaimer>
        <SignupCta />
      </div>
    </ContentPageShell>
  );
}
