import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

vi.mock('@/lib/api/config', () => ({ API_BASE_URL: 'https://api.test/v1' }));
vi.mock('@/lib/api/tokenRefresh', () => ({ refreshToken: vi.fn() }));
const clearLocal = vi.fn();
vi.mock('@/store/api/authApi', () => ({ useLogoutMutation: () => [clearLocal, { isLoading: false }] }));

import { api } from '@/store/api/baseApi';
// The app imports accountsApi first (AppPage -> '@/store/api'); profileApi is injected later with the Settings chunk.
import { accountsApi } from '@/store/api/accountsApi';
import { profileApi } from '@/store/api/profileApi';
import { DeleteAccountDialog } from '../DeleteAccountDialog';

/** jsdom's AbortSignal is not accepted by Node's Request, so the request object is a stand-in; `fetch` is what answers. */
class StandInRequest {
  constructor(public url: string, public init: RequestInit = {}) {}
}

const calls = () => (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map(([r]) => `${(r as StandInRequest).init.method ?? 'GET'} ${(r as StandInRequest).url}`);
const makeStore = () => configureStore({ reducer: { [api.reducerPath]: api.reducer }, middleware: (gdm) => gdm().concat(api.middleware) });

const exportState = { status: 'idle' } as const;

beforeEach(() => {
  vi.stubGlobal('Request', StandInRequest);
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: true, message: 'ok', data: null }), { status: 200, headers: { 'content-type': 'application/json' } })));
  clearLocal.mockReturnValue({ unwrap: () => Promise.resolve() });
  Object.defineProperty(window, 'location', { value: { assign: vi.fn() }, writable: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('deleting the TradeQut account', () => {
  it('the Settings endpoint is its own, so the trading-account endpoint cannot answer for it', () => {
    expect(profileApi.endpoints.deleteUserAccount).toBeDefined();
    expect(profileApi.endpoints.deleteUserAccount).not.toBe(accountsApi.endpoints.deleteAccount);
  });

  it('Delete account sends DELETE /v1/auth/account, never /v1/accounts/<id>', async () => {
    const user = userEvent.setup();
    render(
      <Provider store={makeStore()}>
        <DeleteAccountDialog open email="ada@example.com" onOpenChange={vi.fn()} exportState={exportState} onExport={vi.fn()} />
      </Provider>,
    );
    await user.type(screen.getByLabelText(/Type ada@example.com to confirm/), 'ada@example.com');
    await user.click(screen.getByRole('button', { name: 'Delete account' }));

    await waitFor(() => expect(window.location.assign).toHaveBeenCalledWith('/goodbye'));
    expect(calls()).toEqual(['DELETE https://api.test/v1/auth/account']);
  });

  it('a trading-account delete still goes to /v1/accounts/<id>', async () => {
    await makeStore().dispatch(accountsApi.endpoints.deleteAccount.initiate('acc-1'));
    expect(calls()).toEqual(['DELETE https://api.test/v1/accounts/acc-1']);
  });
});
