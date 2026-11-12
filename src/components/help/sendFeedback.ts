import { API_BASE_URL } from '@/lib/api/config';
import { collectDiagnostics, type Diagnostics, type MessageKind } from './diagnostics';

export type FeedbackOutcome = 'sent' | 'unavailable' | 'failed';

/** POST {API_BASE_URL}/feedback exists once BE-E6 ships; until then VITE_FEEDBACK_API is not `true` and feedback goes by email (a probe would log a 404 in the console). */
const enabled = () => import.meta.env.VITE_FEEDBACK_API === 'true';
let endpointMissing = false;
export const resetFeedbackProbe = () => {
  endpointMissing = false;
};

/**
 * `sent` = stored by the API; `unavailable` = no such endpoint yet (caller opens the mail client);
 * `failed` = the endpoint exists but the request did not go through (caller shows Retry).
 */
export async function sendFeedback(kind: MessageKind, message: string, diag: Diagnostics | null): Promise<FeedbackOutcome> {
  if (!enabled() || endpointMissing) return 'unavailable';
  const d = diag ?? { ...collectDiagnostics(), page: '', userAgent: '' };
  try {
    const token = localStorage.getItem('idToken');
    const res = await fetch(`${API_BASE_URL}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ kind, message: message.trim(), page: d.page, appVersion: d.appVersion, userAgent: d.userAgent }),
    });
    if (res.status === 404) {
      endpointMissing = true;
      return 'unavailable';
    }
    return res.ok ? 'sent' : 'failed';
  } catch {
    return 'failed';
  }
}
