import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const pub = join(process.cwd(), 'public');
const read = (p: string) => readFileSync(join(pub, p), 'utf8');

describe('self-hosted fonts (E-014)', () => {
  const css = read('fonts/fonts.css');
  const files = readdirSync(join(pub, 'fonts')).filter((f) => f.endsWith('.woff2'));

  it('has at most 4 woff2 files and at most 120 kB in total', () => {
    expect(files.length).toBeLessThanOrEqual(4);
    const total = files.reduce((sum, f) => sum + statSync(join(pub, 'fonts', f)).size, 0);
    expect(total).toBeLessThanOrEqual(120 * 1024);
  });

  it('declares each file with a font-display and a unicode-range (block only for the preloaded DM Sans latin file)', () => {
    const faces = css.match(/@font-face \{[^}]*\}/g) ?? [];
    expect(faces).toHaveLength(files.length);
    for (const face of faces) {
      expect(face).toContain(face.includes('/fonts/dm-sans-latin.woff2') ? 'font-display: block' : 'font-display: swap');
      expect(face).toContain('unicode-range:');
      const file = /\/fonts\/([^']+\.woff2)/.exec(face)?.[1];
      expect(files).toContain(file);
    }
  });

  it('covers the rupee sign (U+20B9) for DM Sans through the latin-ext unicode-range', () => {
    const ext = /dm-sans-latin-ext[^}]*unicode-range: ([^;]+);/.exec(css)?.[1] ?? '';
    const covers = (cp: number) =>
      ext.split(',').some((part) => {
        const [lo, hi = lo] = part.trim().replace('U+', '').split('-').map((h) => parseInt(h, 16));
        return cp >= lo && cp <= hi;
      });
    expect(covers(0x20b9)).toBe(true);
  });

  it('is preloaded and loaded from index.html without any third-party font host', () => {
    const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8');
    expect((html.match(/rel="preload"[^>]+as="font"/g) ?? []).length).toBe(2);
    expect(html).toContain('href="/fonts/fonts.css"');
    expect(html).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
  });
});

describe('import template (E-074)', () => {
  const csv = read('import-template.csv').trim().split(/\r?\n/);
  const header = csv[0].split(',');

  it('has every column the generic importer needs for closed trades', () => {
    for (const col of ['Symbol', 'Side', 'Quantity', 'Entry Price', 'Exit Price', 'Open Time']) expect(header).toContain(col);
  });

  it('has three clearly sample rows with consistent column counts', () => {
    expect(csv).toHaveLength(4);
    for (const row of csv.slice(1)) {
      expect(row.split(',')).toHaveLength(header.length);
      expect(row).toContain('SAMPLE-');
    }
  });
});

describe('status.json and manifest', () => {
  it('ships an empty status file (nothing to show) and a valid manifest', () => {
    expect(JSON.parse(read('status.json'))).toEqual({});
    const manifest = JSON.parse(read('site.webmanifest'));
    expect(manifest.start_url).toBe('/app/dashboard');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
  });
});
