import { seoPageSchema } from '@/config/seo';
import { SITE_URL } from '@/content/product-facts';
import { EXPECTANCY } from './expectancy';
import { MAXIMUM_DRAWDOWN } from './maximumDrawdown';
import { PROFIT_FACTOR } from './profitFactor';
import { R_MULTIPLE } from './rMultiple';
import type { MetricTerm, MetricTermId } from './types';
import { WIN_RATE } from './winRate';

export type { MetricTerm, MetricTermId } from './types';

/** The order of the sibling links on every term page. */
export const METRIC_TERMS: MetricTerm[] = [PROFIT_FACTOR, EXPECTANCY, R_MULTIPLE, WIN_RATE, MAXIMUM_DRAWDOWN];

export const GLOSSARY_PARENT = { path: '/glossary', label: 'Trading glossary' } as const;

export function getMetricTerm(id: MetricTermId): MetricTerm {
  const t = METRIC_TERMS.find((x) => x.id === id);
  if (!t) throw new Error(`no metric term ${id}`);
  return t;
}

/** WebPage + BreadcrumbList (Home / Trading glossary / term) + DefinedTerm + FAQPage. */
export function metricTermSchema(t: MetricTerm, title: string) {
  const definedTerm = {
    '@type': 'DefinedTerm',
    name: t.name,
    description: t.definition,
    url: `${SITE_URL}${t.path}`,
    inDefinedTermSet: { '@type': 'DefinedTermSet', name: 'Trading Glossary', url: `${SITE_URL}${GLOSSARY_PARENT.path}` },
  };
  return seoPageSchema({ path: t.path, title, description: t.description, label: t.name, parent: GLOSSARY_PARENT }, [definedTerm], t.faq);
}
