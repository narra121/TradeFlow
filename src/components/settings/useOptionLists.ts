import { useCallback, useMemo, useRef, useState } from 'react';
import { useGetSavedOptionsQuery, useUpdateSavedOptionsMutation, type SavedOptions } from '@/store/api/savedOptionsApi';
import type { ListKey } from '@/components/settings/optionLists';

type Lists = Record<ListKey, string[]>;
/** The API also stores `tags` (BE-E3); the shared `SavedOptions` type predates it. */
type StoredOptions = SavedOptions & { tags?: string[] };

const KEYS: ListKey[] = ['strategies', 'sessions', 'marketConditions', 'mistakes', 'newsEvents', 'tags', 'symbols', 'timeframes'];

export interface OptionListsApi {
  lists: Lists;
  /** Saved options are in memory; edits stay disabled until they are (M40). */
  loaded: boolean;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  refetch: () => void;
  /** The list being written right now, if any. */
  saving: ListKey | null;
  /** Rejects when the write fails; the stored list is then unchanged. */
  update: (key: ListKey, change: (current: string[]) => string[]) => Promise<void>;
}

/** Edits to the saved option lists, applied one after another on the latest copy so two quick edits cannot overwrite each other. */
export function useOptionLists(): OptionListsApi {
  const { data, isLoading, isError, error, refetch } = useGetSavedOptionsQuery(undefined, { refetchOnMountOrArgChange: false });
  const [write] = useUpdateSavedOptionsMutation();
  const [saving, setSaving] = useState<ListKey | null>(null);

  const lists = useMemo<Lists>(() => {
    const stored = (data ?? {}) as StoredOptions;
    return Object.fromEntries(KEYS.map((k) => [k, stored[k] ?? []])) as Lists;
  }, [data]);

  // `latest` follows the cache only when the cache object changes, so a render with the old object cannot undo a finished write.
  const latest = useRef<StoredOptions | undefined>(undefined);
  const seen = useRef<unknown>(undefined);
  if (data !== seen.current) {
    seen.current = data;
    latest.current = data as StoredOptions | undefined;
  }
  const chain = useRef<Promise<unknown>>(Promise.resolve());

  const update = useCallback(
    (key: ListKey, change: (current: string[]) => string[]) => {
      const run = async () => {
        const base = latest.current;
        if (!base) throw new Error('Saved options are not loaded');
        const next = { ...base, [key]: change(base[key] ?? []) } as StoredOptions;
        setSaving(key);
        try {
          await write(next as SavedOptions).unwrap();
          // The next queued edit starts from this write, not from a render that has not happened yet.
          latest.current = next;
        } finally {
          setSaving(null);
        }
      };
      const result = chain.current.then(run, run);
      chain.current = result.catch(() => undefined);
      return result;
    },
    [write],
  );

  return { lists, loaded: !!data, isLoading, isError, error, refetch: () => void refetch(), saving, update };
}
