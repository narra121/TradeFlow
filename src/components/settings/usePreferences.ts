import { useEffect, useRef } from 'react';
import { browserZone } from '@/components/settings/timeZones';
import { useEntitlements } from '@/hooks/useEntitlements';
import { patchUiState, readUiState, type UiState } from '@/hooks/useUiState';
import { useGetProfileQuery, useUpdatePreferencesMutation } from '@/store/api/userApi';
import { useAppDispatch } from '@/store/hooks';
import { applyDefaultPeriod } from '@/store/slices/tradesSlice';

/** What `GET /user/profile` returns under `preferences` that this app reads (BE-E4). */
export interface ServerPreferences {
  timeZone?: string;
  weekStart?: 'mon' | 'sun';
  pnlPalette?: string;
  defaultPeriod?: '7d' | '30d' | '90d' | '1y' | 'ytd' | 'all';
  carryForwardGoalsRules?: boolean;
  notifications?: { weeklyReport?: boolean; tradeReminders?: boolean; goalAlerts?: boolean };
}

const SERVER_PERIOD: Record<string, UiState['defaultPeriod'] | undefined> = { all: 'all', '7d': 7, '30d': 30, '90d': 90, '1y': 365 };

export function periodToServer(p: UiState['defaultPeriod']): ServerPreferences['defaultPeriod'] | undefined {
  return ({ all: 'all', 7: '7d', 30: '30d', 90: '90d', 365: '1y' } as Record<string, ServerPreferences['defaultPeriod']>)[String(p)];
}

/** The device copy (`tq.ui`) that the server's account-level values should win over. */
export function deviceFromServer(prefs: ServerPreferences | undefined): Partial<UiState> {
  if (!prefs) return {};
  const patch: Partial<UiState> = {};
  if (prefs.timeZone) patch.timeZone = prefs.timeZone;
  if (prefs.pnlPalette === 'default' || prefs.pnlPalette === 'cb') patch.pnlPalette = prefs.pnlPalette;
  const period = prefs.defaultPeriod ? SERVER_PERIOD[prefs.defaultPeriod] : undefined;
  if (period !== undefined) patch.defaultPeriod = period;
  return patch;
}

export interface PreferencesApi {
  prefs: ServerPreferences | undefined;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  /** Rejects when the server refuses the change. */
  save: (patch: Partial<ServerPreferences>) => Promise<void>;
}

export function usePreferences(): PreferencesApi {
  const { data, isLoading, isError, error } = useGetProfileQuery();
  const [update] = useUpdatePreferencesMutation();
  const prefs = (data as { preferences?: ServerPreferences } | undefined)?.preferences;
  return {
    prefs,
    isLoading,
    isError,
    error,
    save: async (patch) => {
      await update(patch as never).unwrap();
    },
  };
}

/**
 * True when the account has never saved a time zone (GET /user/profile sends none until one is stored), so this
 * browser's zone should become the account's. A read-only plan cannot save (402), so it is left alone.
 */
export function needsTimeZone(prefs: ServerPreferences | undefined, plan: { isLoading: boolean; readOnly: boolean; plan: string | null }): boolean {
  return !!prefs && !prefs.timeZone && !plan.isLoading && !!plan.plan && !plan.readOnly;
}

/**
 * Copies account-level preferences into the device copy once they are loaded, starts a session whose period nobody
 * picked on the account's default period, and saves the browser's zone once for
 * an account that has none, so the screen and the server's day buckets (stats, reports) use one zone. Mount once inside the app shell.
 */
export function useSyncServerPreferences(): void {
  const { prefs } = usePreferences();
  const ent = useEntitlements();
  const [update] = useUpdatePreferencesMutation();
  const dispatch = useAppDispatch();
  const adopting = useRef(false);
  const periodApplied = useRef(false);
  useEffect(() => {
    const patch = deviceFromServer(prefs);
    const current = readUiState();
    const changed = (Object.keys(patch) as (keyof UiState)[]).some((k) => current[k] !== patch[k]);
    if (changed) patchUiState(patch);
    // Default period = "the period a new session starts with": applied once per app load, so a later change in
    // Settings waits for the next session.
    if (!prefs || periodApplied.current) return;
    periodApplied.current = true;
    if (patch.defaultPeriod !== undefined) dispatch(applyDefaultPeriod(patch.defaultPeriod));
  }, [prefs, dispatch]);
  useEffect(() => {
    if (adopting.current || !needsTimeZone(prefs, ent)) return;
    adopting.current = true;
    const zone = browserZone();
    // Once per app load: a failed save is tried again on the next load. The profile refetch that follows a save brings
    // the zone back into the device copy above.
    update({ timeZone: zone }).unwrap().catch(() => undefined);
  }, [prefs, ent, update]);
}
