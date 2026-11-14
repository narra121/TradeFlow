import { useEffect, useState, type RefObject } from 'react';

interface TocItem {
  id: string;
  text: string;
}

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * "On this page" list built from the `h2`s inside `root`, so every article gets one without being edited. Headings without an
 * id receive a stable one from their text. Shown only for articles with at least `min` sections; follows lazy content as it loads.
 */
export function ArticleToc({ root, min = 3 }: { root: RefObject<HTMLElement>; min?: number }) {
  const [items, setItems] = useState<TocItem[]>([]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const build = () => {
      const seen = new Set<string>();
      const next: TocItem[] = [];
      el.querySelectorAll('h2').forEach((h) => {
        const text = (h.textContent ?? '').trim();
        if (!text) return;
        let id = h.id || slug(text);
        while (seen.has(id)) id = `${id}-2`;
        seen.add(id);
        if (!h.id) h.id = id;
        next.push({ id, text });
      });
      setItems((prev) => (prev.length === next.length && prev.every((p, i) => p.id === next[i].id) ? prev : next));
    };
    build();
    const observer = new MutationObserver(build);
    observer.observe(el, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [root]);

  if (items.length < min) return null;
  return (
    <nav aria-label="On this page" className="mb-8 rounded-lg border border-border bg-card p-4">
      <p className="mb-2 text-sm font-semibold text-foreground">On this page</p>
      <ol className="list-decimal space-y-1 pl-5 text-sm">
        {items.map((i) => (
          <li key={i.id}>
            <a href={`#${i.id}`} className="inline-flex min-h-6 max-md:min-h-11 items-center text-foreground-soft hover:text-foreground hover:underline">
              {i.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
