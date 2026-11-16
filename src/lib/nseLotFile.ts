/** Reads NSE's fo_mktlots.csv in the browser, from a file the visitor saved themselves. Nothing here is fetched or stored. */

export interface LotRow {
  name: string;
  symbol: string;
  /** One entry per month of the section, in the same order; null where NSE lists no contract for that month. */
  lots: (number | null)[];
}

export interface LotSection {
  /** Expiry-month labels as written in the file, e.g. "NOV-26". */
  months: string[];
  rows: LotRow[];
}

/** The file lists indices first, then a second header row ("Derivatives on Individual Securities") that starts the stocks with its own, shorter month list. */
export interface LotFile {
  indices: LotSection;
  stocks: LotSection;
}

const MONTH_LABEL = /^[A-Z]{3}-\d{2}$/;

const toLot = (cell: string | undefined): number | null => (cell && /^\d+$/.test(cell) ? Number(cell) : null);

export function parseLotFile(text: string): LotFile {
  const sections: LotSection[] = [];
  for (const line of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cells = line.split(',').map((c) => c.trim());
    const filled = cells.slice(2).filter(Boolean);
    if (filled.length > 0 && filled.every((c) => MONTH_LABEL.test(c))) {
      sections.push({ months: filled, rows: [] });
      continue;
    }
    const section = sections[sections.length - 1];
    if (section && cells[0] && cells[1]) {
      section.rows.push({ name: cells[0], symbol: cells[1], lots: section.months.map((_, i) => toLot(cells[2 + i])) });
    }
  }
  if (!sections[0]?.rows.length) throw new Error('This does not look like the NSE F&O lot file: no month header row or no underlyings were found.');
  return { indices: sections[0], stocks: sections[1] ?? { months: [], rows: [] } };
}

/** Every word typed must appear in the name or the symbol, so "bank nifty" finds NIFTY BANK and BANKNIFTY. */
export function searchRows(rows: LotRow[], query: string): LotRow[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return rows;
  return rows.filter((r) => {
    const haystack = `${r.name} ${r.symbol}`.toLowerCase();
    return words.every((w) => haystack.includes(w));
  });
}

/** The first month that has a lot size, the value later months are compared with. */
export function firstLot(row: LotRow): number | null {
  return row.lots.find((l) => l !== null) ?? null;
}

/** True when the lot size differs between months of the same underlying. */
export function changesLater(row: LotRow): boolean {
  const first = firstLot(row);
  return row.lots.some((l) => l !== null && l !== first);
}

export function contractValue(price: number, lot: number): number {
  return price * lot;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2025-10-03" as "3 Oct 2025". */
export function formatDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTH_NAMES[m - 1]} ${y}`;
}
