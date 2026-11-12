import { useCallback, useState } from 'react';
import { CHANGELOG_ENTRIES, type ChangelogEntry } from '@/content/changelog/entries';

const SEEN_KEY = 'tq.whatsnew.seen';

const readSeen = (): string | null => {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
};

/** Id of the newest entry, or null when there are none. */
export const latestEntryId = (entries: readonly ChangelogEntry[] = CHANGELOG_ENTRIES): string | null => entries[0]?.id ?? null;

/** True while the newest changelog entry is newer than the one last opened. */
export function hasUnseenEntries(entries: readonly ChangelogEntry[] = CHANGELOG_ENTRIES, seen: string | null = readSeen()): boolean {
  const latest = latestEntryId(entries);
  return !!latest && seen !== latest;
}

/** Unseen dot state for the `?` button: `markSeen` stores the newest entry and clears the dot. */
export function useWhatsNew() {
  const [unseen, setUnseen] = useState(() => hasUnseenEntries());
  const markSeen = useCallback(() => {
    const latest = latestEntryId();
    if (latest) {
      try {
        localStorage.setItem(SEEN_KEY, latest);
      } catch {
        // not persisted: the dot returns next session
      }
    }
    setUnseen(false);
  }, []);
  return { unseen, markSeen };
}
