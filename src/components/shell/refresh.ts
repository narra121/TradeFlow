import type { AppDispatch } from '@/store';
import { api } from '@/store/api/baseApi';

const REFRESH_TAGS = ['Trades', 'Stats', 'Accounts', 'Goals', 'Rules'] as const;
const RETURN_TAGS = ['Stats', 'Goals'] as const;

/** Refetches what the screen shows (the `Updated ↻` button and `Shift+R`); the scope bar listens for the event to restamp itself. */
export function refreshData(dispatch: AppDispatch): void {
  dispatch(api.util.invalidateTags([...REFRESH_TAGS]));
  window.dispatchEvent(new Event('tq:refreshed'));
}

/** Coming back to the tab after a while: only the figures the clock and the stream change. The trade lists are patched in place; reloading them is up to 50 calls. */
export function refreshOnReturn(dispatch: AppDispatch): void {
  dispatch(api.util.invalidateTags([...RETURN_TAGS]));
}
