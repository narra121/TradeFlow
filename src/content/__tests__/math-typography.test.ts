import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GLOSSARY_TERMS } from '@/content/glossary/terms';

/** D.3: U+2212 for minus and negative money, × for multiplication; a hyphen-minus or a letter x reads as a dash or a variable. */
const BAD = [
  { name: 'x as multiplication', re: /(?:[\d)%]|\b(?:Win|Loss|Rate|Size|Equity|Peak\[i\]))%? x (?:[($\d]|Avg|Lot|Position|Risk|100)/ },
  { name: 'hyphen-minus between amounts', re: /(?:\$[\d,.]+|\)|\b\d[\d,.]*%?) - (?:[($]|\d)/ },
  { name: 'hyphen-minus before money', re: /(?:^|[\s(:])-\$\d/ },
  { name: 'hyphen-minus in a formula', re: /= .*\([A-Z][\w %[\]]* - [A-Z]/ },
];

const glossaryText = GLOSSARY_TERMS.flatMap((t) => [t.definition, t.formula ?? '', t.example ?? '']);
const blogDir = join(process.cwd(), 'src', 'content', 'blog');
const blogText = readdirSync(blogDir)
  .filter((f) => f.endsWith('.tsx'))
  .map((f) => readFileSync(join(blogDir, f), 'utf8'));

describe('math typography in public copy', () => {
  for (const { name, re } of BAD) {
    it(`glossary has no ${name}`, () => {
      expect(glossaryText.filter((t) => re.test(t))).toEqual([]);
    });
    it(`blog articles have no ${name}`, () => {
      expect(blogText.flatMap((t) => t.split('\n')).filter((line) => re.test(line))).toEqual([]);
    });
  }
});
