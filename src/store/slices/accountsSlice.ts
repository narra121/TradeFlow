import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { accountsApi, CreateAccountPayload } from '@/lib/api';
import { handleApiError } from '@/lib/api';
import { TradingAccount, AccountStatus } from '@/types/trade';

export interface AccountsState {
  accounts: TradingAccount[];
  selectedAccountId: string | null;
  totalBalance: number;
  totalPnl: number;
  loading: boolean;
  error: string | null;
}

const initialState: AccountsState = {
  accounts: [],
  selectedAccountId: null,
  totalBalance: 0,
  totalPnl: 0,
  loading: false,
  error: null,
};

// Async thunks
export const fetchAccounts = createAsyncThunk(
  'accounts/fetchAccounts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await accountsApi.getAccounts();
      return response;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const createAccount = createAsyncThunk(
  'accounts/createAccount',
  async (payload: CreateAccountPayload, { rejectWithValue }) => {
    try {
      const response = await accountsApi.createAccount(payload);
      return response.account;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const updateAccount = createAsyncThunk(
  'accounts/updateAccount',
  async ({ id, payload }: { id: string; payload: Partial<CreateAccountPayload> }, { rejectWithValue }) => {
    try {
      const response = await accountsApi.updateAccount(id, payload);
      return response.account;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const updateAccountStatus = createAsyncThunk(
  'accounts/updateAccountStatus',
  async ({ id, status }: { id: string; status: AccountStatus }, { rejectWithValue }) => {
    try {
      const response = await accountsApi.updateAccountStatus(id, status);
      return response.account;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const deleteAccount = createAsyncThunk(
  'accounts/deleteAccount',
  async (id: string, { rejectWithValue }) => {
    try {
      await accountsApi.deleteAccount(id);
      return id;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Slice
const accountsSlice = createSlice({
  name: 'accounts',
  initialState,
  reducers: {
    setSelectedAccount: (state, action) => {
      state.selectedAccountId = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Accounts
    builder
      .addCase(fetchAccounts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAccounts.fulfilled, (state, action) => {
        state.loading = false;
        state.accounts = action.payload.accounts;
        state.totalBalance = action.payload.totalBalance || 0;
        state.totalPnl = action.payload.totalPnl || 0;
        state.error = null;
      })
      .addCase(fetchAccounts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create Account
    builder
      .addCase(createAccount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createAccount.fulfilled, (state, action) => {
        state.loading = false;
        state.accounts.push(action.payload);
        state.error = null;
      })
      .addCase(createAccount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update Account
    builder
      .addCase(updateAccount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAccount.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.accounts.findIndex(acc => acc.id === action.payload.id);
        if (index !== -1) {
          state.accounts[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(updateAccount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update Account Status
    builder
      .addCase(updateAccountStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAccountStatus.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.accounts.findIndex(acc => acc.id === action.payload.id);
        if (index !== -1) {
          state.accounts[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(updateAccountStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Delete Account
    builder
      .addCase(deleteAccount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAccount.fulfilled, (state, action) => {
        state.loading = false;
        state.accounts = state.accounts.filter(acc => acc.id !== action.payload);
        if (state.selectedAccountId === action.payload) {
          state.selectedAccountId = null;
        }
        state.error = null;
      })
      .addCase(deleteAccount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setSelectedAccount, clearError } = accountsSlice.actions;
export default accountsSlice.reducer;
