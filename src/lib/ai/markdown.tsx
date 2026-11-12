import type { ReactNode } from 'react';
import { splitTradeRefs } from './chatStream';

export type Block = { type: 'p'; text: string } | { type: 'ul' | 'ol'; items: string[] };

/** Blocks of the safe subset: paragraphs, `-`/`*` bullet lists and `1.` numbered lists. Nothing is ever interpreted as HTML. */
export function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: { type: 'ul' | 'ol'; items: string[] } | null = null;
  const flushPara = () => {
    if (para.length) blocks.push({ type: 'p', text: para.join('\n') });
    para = [];
  };
  const flushList = () => {
    if (list) blocks.push(list);
    list = null;
  };
  for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trimEnd();
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      flushPara();
      const type = bullet ? 'ul' : 'ol';
      if (list && list.type !== type) flushList();
      list = list ?? { type, items: [] };
      list.items.push((bullet ?? numbered)![1]);
    } else if (line.trim() === '') {
      flushPara();
      flushList();
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return blocks;
}

/** `**bold**` and `` `code` `` inside one run of text. */
function inline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    out.push(tok.startsWith('**') ? <strong key={`${keyPrefix}-${i++}`}>{tok.slice(2, -2)}</strong> : <code key={`${keyPrefix}-${i++}`} className="rounded-sm bg-muted px-1 font-mono text-13">{tok.slice(1, -1)}</code>);
    last = m.index! + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export interface RenderOptions {
  /** called when a `[#tradeId]` chip is activated */
  onTrade: (id: string) => void;
}

/** Ids cited in an answer, in order of first appearance. */
export function citedTradeIds(text: string): string[] {
  const ids: string[] = [];
  for (const part of splitTradeRefs(text)) if (part.type === 'trade' && !ids.includes(part.id)) ids.push(part.id);
  return ids;
}

function withChips(text: string, keyPrefix: string, ids: string[], opts: RenderOptions): ReactNode[] {
  const out: ReactNode[] = [];
  splitTradeRefs(text).forEach((p, i) => {
    if (p.type === 'text') {
      out.push(...inline(p.text, `${keyPrefix}-${i}`));
      return;
    }
    const n = ids.indexOf(p.id) + 1;
    out.push(
      <button
        key={`${keyPrefix}-${i}`}
        type="button"
        onClick={() => opts.onTrade(p.id)}
        aria-label={`Open trade ${n}`}
        className="mx-0.5 inline-flex h-6 items-center rounded-sm border border-border px-1.5 text-xs text-foreground-soft hover:bg-muted"
      >
        Trade {n}
      </button>,
    );
  });
  return out;
}

/** Safe-markdown rendering of an assistant answer with trade-reference chips. */
export function renderAnswer(text: string, opts: RenderOptions): ReactNode {
  const ids = citedTradeIds(text);
  return (
    <>
      {parseBlocks(text).map((b, i) =>
        b.type === 'p' ? (
          <p key={i} className="whitespace-pre-wrap">{withChips(b.text, `p${i}`, ids, opts)}</p>
        ) : b.type === 'ul' ? (
          <ul key={i} className="list-disc space-y-1 pl-5">{b.items.map((it, j) => <li key={j}>{withChips(it, `u${i}-${j}`, ids, opts)}</li>)}</ul>
        ) : (
          <ol key={i} className="list-decimal space-y-1 pl-5">{b.items.map((it, j) => <li key={j}>{withChips(it, `o${i}-${j}`, ids, opts)}</li>)}</ol>
        ),
      )}
    </>
  );
}

