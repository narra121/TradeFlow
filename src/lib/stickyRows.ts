export interface StickyState {
  /** Signature of the filters, sort, view and scope the kept rows belong to. */
  sig: string;
  /** Ids shown by the previous call. */
  shown: string[];
  /** Ids kept in place although they no longer match. */
  keep: Set<string>;
}

export const newStickyState = (): StickyState => ({ sig: '', shown: [], keep: new Set() });

/**
 * "Sticky until refresh" (E-051): a row edited so that it no longer matches stays in the list until the next
 * filter, sort or scope change, so rows never jump away under the cursor. Only rows that still exist are kept;
 * `order` places them with the rest. Mutates `state`; call it again with the same `sig` after every data change.
 */
export function withStickyRows<T extends { id: string }>(fresh: T[], all: T[], state: StickyState, sig: string, order: (rows: T[]) => T[]): T[] {
  const byId = new Map(all.map((t) => [t.id, t]));
  const freshIds = new Set(fresh.map((t) => t.id));
  if (state.sig !== sig) {
    state.sig = sig;
    state.keep = new Set();
  } else {
    for (const id of state.shown) if (!freshIds.has(id) && byId.has(id)) state.keep.add(id);
  }
  for (const id of [...state.keep]) if (freshIds.has(id) || !byId.has(id)) state.keep.delete(id);
  const kept = [...state.keep].map((id) => byId.get(id) as T);
  const out = kept.length ? order([...fresh, ...kept]) : fresh;
  state.shown = out.map((t) => t.id);
  return out;
}

/** `Shift+R`: forget the kept rows so they leave on the next render. */
export function clearSticky(state: StickyState): void {
  state.keep = new Set();
  state.shown = [];
}
