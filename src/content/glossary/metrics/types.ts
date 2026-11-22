import type { ReactNode } from 'react';
import type { FaqItem } from '@/content/product-facts';

export type MetricTermId = 'profit-factor' | 'expectancy' | 'r-multiple' | 'win-rate' | 'maximum-drawdown';

export interface MetricTerm {
  id: MetricTermId;
  path: `/glossary/${MetricTermId}`;
  /** Sentence case: the h1, the breadcrumb and the sibling links. */
  name: string;
  /** How the term reads inside the layout's headings ("How to read an R-multiple"). */
  inText: string;
  /** Without the brand suffix; at most 60 characters. */
  title: string;
  /** At most 160 characters. */
  description: string;
  /** Plain text: the opening paragraph and the DefinedTerm description. Its first sentence answers "what is …" on its own. */
  definition: string;
  formula: { words: ReactNode; lines: string[]; key: ReactNode };
  example: { heading: string; intro: ReactNode; caption: string; head: string[]; rows: string[][]; working: ReactNode[]; after: ReactNode };
  calculator: { intro: ReactNode; limits: ReactNode };
  reading: ReactNode;
  hides: { lead: string; text: ReactNode }[];
  mistakes: { lead: string; text: ReactNode }[];
  /** Two or three sentences that summarise the deeper article and tools, with the links. */
  deeper: ReactNode;
  /** What TradeQut shows for the metric, worded from src/components/stats/metricDefs.ts and ANALYTICS_TABS. */
  inJournal: ReactNode;
  faq: FaqItem[];
}
