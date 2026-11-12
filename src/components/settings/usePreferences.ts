import { useEffect } from 'react';
import { patchUiState, readUiState, type UiState } from '@/hooks/useUiState';
import { useGetProfileQuery, useUpdatePreferencesMutation } from '@/store/api/userApi';

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
  /** Rejects when the server refuses the change. */
  save: (patch: Partial<ServerPreferences>) => Promise<void>;
}

export function usePreferences(): PreferencesApi {
  const { data, isLoading, isError } = useGetProfileQuery();
  const [update] = useUpdatePreferencesMutation();
  const prefs = (data as { preferences?: ServerPreferences } | undefined)?.preferences;
  return {
    prefs,
    isLoading,
    isError,
    save: async (patch) => {
      await update(patch as never).unwrap();
    },
  };
}

/** Copies account-level preferences into the device copy once they are loaded; mount once inside the app shell. */
export function useSyncServerPreferences(): void {
  const { prefs } = usePreferences();
  useEffect(() => {
    const patch = deviceFromServer(prefs);
    const current = readUiState();
    const changed = (Object.keys(patch) as (keyof UiState)[]).some((k) => current[k] !== patch[k]);
    if (changed) patchUiState(patch);
  }, [prefs]);
}
