import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { A, SignupCta, Sources } from '@/content/components/ArticleParts';
import { ContactBlock } from '@/components/content/LegalLayout';

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return f === '__tests__' ? [] : walk(p);
    return p.endsWith('.tsx') ? [p] : [];
  });
const PUBLIC_SOURCES = ['src/pages', 'src/components/content', 'src/components/public', 'src/content'].flatMap((d) => walk(join(process.cwd(), d)));

describe('links in running text are underlined at rest (WCAG 1.4.1, axe link-in-text-block)', () => {
  it('article links, internal and external, and source links', () => {
    render(
      <MemoryRouter>
        <p>
          See <A to="/glossary">the glossary</A> and <A to="https://example.com">a source</A>.
        </p>
        <Sources items={[{ label: 'A vendor page', url: 'https://example.com/p', checked: '2026-11-12' }]} />
      </MemoryRouter>,
    );
    for (const name of ['the glossary', 'a source', 'A vendor page']) expect(screen.getByRole('link', { name })).toHaveClass('underline');
  });

  it('the contact email and phone', () => {
    render(<ContactBlock />);
    for (const link of screen.getAllByRole('link')) expect(link).toHaveClass('underline');
  });

  it('no public page or article colours an inline link without an underline', () => {
    // A standalone link (inline-flex: TOC, breadcrumbs, CTAs) is not in a text block, so axe does not ask it to be underlined.
    const offenders = PUBLIC_SOURCES.flatMap((f) =>
      [...readFileSync(f, 'utf8').matchAll(/<(?:Link|a)\b[^>]*className="([^"]*)"/g)]
        .map((m) => m[1])
        .filter((cls) => /(?:^|\s)text-primary(?:\s|$)/.test(cls) && !/(?:^|\s)underline(?:\s|$)/.test(cls) && !/inline-flex|\bflex\b|\bblock\b/.test(cls))
        .map((cls) => `${f.split(/[\\/]src[\\/]/)[1]}: ${cls}`),
    );
    expect(offenders).toEqual([]);
  });
});

describe('standalone links and controls are 44 px high on phones (DESIGN-SHARED S10)', () => {
  it('the article sign-up call to action: 44 px on phones, flat (no glow), the shared Start free wording', () => {
    render(
      <MemoryRouter>
        <SignupCta />
      </MemoryRouter>,
    );
    const cta = screen.getByRole('link', { name: 'Start free' });
    expect(cta).toHaveClass('max-md:h-11');
    expect(cta).not.toHaveClass('glow-primary');
  });

  it('every 24 px inline-flex link or button grows to 44 px below md', () => {
    const offenders = PUBLIC_SOURCES.flatMap((f) =>
      readFileSync(f, 'utf8')
        .split('\n')
        .filter((line) => /inline-flex min-h-6\b/.test(line) && !/max-md:min-h-11/.test(line))
        .map((line) => `${f.split(/[\\/]src[\\/]/)[1]}: ${line.trim().slice(0, 80)}`),
    );
    expect(offenders).toEqual([]);
  });
});
