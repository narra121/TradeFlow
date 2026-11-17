import type { ReactNode } from 'react';

/** "read-only" never breaks at its hyphen: one status word split over two lines reads as two words. */
export function keepReadOnly(text: string): ReactNode {
  const parts = text.split(/([Rr]ead-only)/);
  if (parts.length === 1) return text;
  return parts.map((part, i) => (i % 2 ? <span key={i} className="whitespace-nowrap">{part}</span> : part));
}
