import type { AppDispatch } from '@/store';
import { api } from '@/store/api/baseApi';

const REFRESH_TAGS = ['Trades', 'Stats', 'Accounts', 'Goals', 'Rules'] as const;

/** Refetches what the screen shows (the `Updated ↻` button and `Shift+R`); the scope bar listens for the event to restamp itself. */
export function refreshData(dispatch: AppDispatch): void {
  dispatch(api.util.invalidateTags([...REFRESH_TAGS]));
  window.dispatchEvent(new Event('tq:refreshed'));
}
