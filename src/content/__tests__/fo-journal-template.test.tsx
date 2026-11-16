import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BLOG_ARTICLES } from '../blog/articles';
import { getPublicRoutes } from '../route-registry';

const pub = (p: string) => join(process.cwd(), 'public', p);
const XLSX = 'templates/tradequt-fo-trading-journal.xlsx';
const CSV = 'templates/tradequt-fo-trading-journal.csv';

/** Entries of a .xlsx (zip) by name; stored or deflated members only. */
function unzip(buf: Buffer): Map<string, string> {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = new Map<string, string>();
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    const dataStart = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const data = buf.subarray(dataStart, dataStart + size);
    files.set(name, (method === 8 ? inflateRawSync(data) : data).toString('utf8'));
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

/** Splits one CSV line, honouring double-quoted fields. */
const fields = (line: string) => [...line.matchAll(/("([^"]|"")*"|[^,]*)(,|$)/g)].slice(0, -1).map((m) => m[1].replace(/^"|"$/g, ''));

const HEADER = [
  'Date', 'Underlying', 'Expiry', 'Strike', 'CE/PE/FUT', 'Side', 'Lots', 'Lot size', 'Quantity', 'Entry price', 'Exit price', 'Setup',
  'Mistake / notes', 'Gross P&L', 'Turnover', 'Brokerage', 'STT', 'Exchange charge', 'SEBI fee', 'Stamp duty', 'GST', 'Total charges', 'Net P&L', 'Weekday',
];

describe('free NSE F&O journal template download', () => {
  const article = BLOG_ARTICLES.find((a) => a.slug === 'trading-journal-excel-template')!;

  it('the article links both files with a download attribute and the files exist in public/templates', async () => {
    const Content = (await article.content()).default;
    const { container } = render(
      <MemoryRouter>
        <Content />
      </MemoryRouter>,
    );
    const links = [...container.querySelectorAll('a[download]')].map((a) => a.getAttribute('href'));
    expect(links).toEqual([`/${XLSX}`, `/${CSV}`]);
    for (const f of [XLSX, CSV]) expect(existsSync(pub(f)), f).toBe(true);
  });

  it('links to existing TradeQut import pages and mentions the rates effective date', async () => {
    const Content = (await article.content()).default;
    const { container } = render(
      <MemoryRouter>
        <Content />
      </MemoryRouter>,
    );
    const paths = new Set(getPublicRoutes().map((r) => r.path));
    for (const to of ['/fo-trading-journal', '/zerodha-trading-journal']) {
      expect(paths.has(to), to).toBe(true);
      expect(container.querySelector(`a[href="${to}"]`), to).not.toBeNull();
    }
    expect(container.textContent).toContain('1 April 2026');
    expect(container.textContent).toMatch(/contract note/i);
    expect(article.updatedAt).toBe('2026-11-15');
  });

  it('the workbook has its four sheets, filled-down formulas, cached values and no error values', () => {
    const files = unzip(readFileSync(pub(XLSX)));
    const workbook = files.get('xl/workbook.xml')!;
    for (const name of ['Journal', 'Rates', 'Summary', 'Instructions']) expect(workbook).toContain(`name="${name}"`);
    const sheets = [...files.entries()].filter(([n]) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n));
    expect(sheets).toHaveLength(4);
    for (const [, xml] of sheets) expect(xml).not.toMatch(/#(REF|NAME|VALUE|DIV\/0|N\/A)[!?]?/);
    const journal = files.get('xl/worksheets/sheet1.xml')!;
    expect((journal.match(/<f[ >]/g) ?? []).length).toBeGreaterThan(500 * 12);
    expect(journal).toContain('<v>');
    expect(journal).toMatch(/<dataValidation [^>]*type="list"/);
  });

  it('the CSV has the journal columns and five labelled sample rows of equal width', () => {
    const lines = readFileSync(pub(CSV), 'utf8').trim().split(/\r?\n/);
    expect(fields(lines[0])).toEqual(HEADER);
    expect(lines).toHaveLength(6);
    for (const line of lines.slice(1)) {
      const row = fields(line);
      expect(row).toHaveLength(HEADER.length);
      expect(row[12]).toMatch(/^SAMPLE/);
      expect(Number(row[22])).toBeCloseTo(Number(row[13]) - Number(row[21]), 2);
    }
  });
});
