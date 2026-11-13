import { useLocation } from 'react-router-dom';
import { arrivalNotice, type Arrival } from '@/components/auth/authErrors';
import { safeDestination } from '@/lib/auth/destination';

interface FromState {
  from?: { pathname?: string; search?: string; hash?: string };
  reason?: string;
  /** The address typed on the page the user came from, carried so it is never typed twice. */
  email?: string;
  /** Opens the form with focus in Password (the email is already known). */
  focus?: 'password';
}

/** Where to go after logging in (the page the user asked for, else the app), the arrival notice and any email carried over. */
export function useAuthArrival(): { destination: string; arrival: Arrival | null; state: FromState } {
  const location = useLocation();
  const state = (location.state ?? {}) as FromState;
  const from = state.from;
  const target = safeDestination(from?.pathname ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}` : null);
  const reason = state.reason ?? new URLSearchParams(location.search).get('reason');
  return { destination: target ?? '/app', arrival: arrivalNotice(reason, !!target), state };
}
