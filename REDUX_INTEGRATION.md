# Redux Toolkit API Integration Guide

This document explains how the Redux Toolkit integration works in the TradeFlow frontend application.

## Architecture Overview

The application uses Redux Toolkit for state management with the following structure:

```
Frontend/src/
├── lib/
│   └── api/
│       ├── api.ts              # Axios instance with interceptors
│       ├── auth.ts             # Authentication API calls
│       ├── accounts.ts         # Accounts API calls
│       ├── trades.ts           # Trades API calls
│       ├── stats.ts            # Statistics API calls
│       ├── analytics.ts        # Analytics API calls
│       ├── goalsRules.ts       # Goals & Rules API calls
│       ├── user.ts             # User & subscription API calls
│       └── index.ts            # Export all APIs
├── store/
│   ├── slices/
│   │   ├── authSlice.ts        # Authentication state
│   │   ├── accountsSlice.ts    # Accounts state
│   │   ├── tradesSlice.ts      # Trades state
│   │   ├── statsSlice.ts       # Statistics state
│   │   ├── analyticsSlice.ts   # Analytics state
│   │   ├── goalsRulesSlice.ts  # Goals & Rules state
│   │   └── userSlice.ts        # User profile state
│   ├── index.ts                # Store configuration
│   └── hooks.ts                # Typed hooks (useAppDispatch, useAppSelector)
```

## Setup & Configuration

### 1. Environment Variables

Copy `.env.example` to `.env` and configure your API URL:

```bash
VITE_API_URL=https://your-api-id.execute-api.your-region.amazonaws.com/v1
```

### 2. Store Provider

The Redux store is provided at the root level in `main.tsx`:

```tsx
import { Provider } from "react-redux";
import { store } from "./store";

createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <App />
  </Provider>
);
```

## Using Redux in Components

### Import Hooks

```tsx
import { useAppDispatch, useAppSelector } from "@/store/hooks";
```

### Access State

```tsx
const { user, loading, error } = useAppSelector((state) => state.auth);
const { accounts } = useAppSelector((state) => state.accounts);
const { trades } = useAppSelector((state) => state.trades);
```

### Dispatch Actions

```tsx
const dispatch = useAppDispatch();

// Async thunks
dispatch(login({ email, password }));
dispatch(fetchAccounts());
dispatch(createTrade(tradeData));

// Sync actions
dispatch(setSelectedAccount(accountId));
dispatch(clearError());
```

## API Layer

### Axios Instance (`lib/api/api.ts`)

The axios instance includes:
- Automatic Bearer token injection from localStorage
- Response interceptors for error handling
- Automatic 401 handling (redirects to login)
- Centralized error formatting

### API Modules

Each API module exports functions that return promises:

```typescript
// lib/api/accounts.ts
export const accountsApi = {
  getAccounts: async (): Promise<AccountsResponse> => {
    return apiClient.get('/accounts');
  },
  createAccount: async (payload: CreateAccountPayload): Promise<{ account: TradingAccount }> => {
    return apiClient.post('/accounts', payload);
  },
  // ...
};
```

## Redux Slices

### Structure

Each slice follows this pattern:

```typescript
export interface SliceState {
  data: DataType[];
  loading: boolean;
  error: string | null;
}

// Async thunks for API calls
export const fetchData = createAsyncThunk('slice/fetchData', async (params, { rejectWithValue }) => {
  try {
    const response = await api.getData(params);
    return response;
  } catch (error) {
    return rejectWithValue(handleApiError(error));
  }
});

// Slice with reducers and extra reducers
const slice = createSlice({
  name: 'slice',
  initialState,
  reducers: {
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchData.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});
```

### Available Slices

#### 1. Auth Slice (`authSlice.ts`)

**State:**
```typescript
{
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  signupSuccess: boolean;
}
```

**Thunks:**
- `signup(payload)` - Register new user
- `confirmSignup(payload)` - Verify email with OTP
- `login(payload)` - Login user
- `forgotPassword(payload)` - Request password reset
- `resetPassword(payload)` - Reset password with code
- `logoutAll()` - Logout from all devices
- `deleteAccount(password)` - Delete user account

**Actions:**
- `logout()` - Client-side logout
- `clearError()` - Clear error state
- `clearSignupSuccess()` - Clear signup success flag

#### 2. Accounts Slice (`accountsSlice.ts`)

**State:**
```typescript
{
  accounts: TradingAccount[];
  selectedAccountId: string | null;
  totalBalance: number;
  totalPnl: number;
  loading: boolean;
  error: string | null;
}
```

**Thunks:**
- `fetchAccounts()` - Get all accounts
- `createAccount(payload)` - Create new account
- `updateAccount({ id, payload })` - Update account
- `updateAccountStatus({ id, status })` - Update account status
- `deleteAccount(id)` - Delete account

**Actions:**
- `setSelectedAccount(id)` - Set selected account filter
- `clearError()` - Clear error state

#### 3. Trades Slice (`tradesSlice.ts`)

**State:**
```typescript
{
  trades: Trade[];
  loading: boolean;
  error: string | null;
  filters: TradesQueryParams;
}
```

**Thunks:**
- `fetchTrades(params)` - Get trades with filters
- `createTrade(payload)` - Create new trade
- `updateTrade({ id, payload })` - Update trade
- `deleteTrade(id)` - Delete trade
- `bulkImportTrades(payload)` - Import multiple trades
- `getUploadUrl()` - Get presigned S3 URL for image upload

**Actions:**
- `setFilters(filters)` - Set trade filters
- `clearFilters()` - Clear all filters
- `clearError()` - Clear error state

#### 4. Stats Slice (`statsSlice.ts`)

**State:**
```typescript
{
  portfolioStats: PortfolioStats | null;
  dailyStats: DailyStats[];
  loading: boolean;
  error: string | null;
}
```

**Thunks:**
- `fetchStats(params)` - Get portfolio statistics
- `fetchDailyStats(params)` - Get daily P&L data

#### 5. Analytics Slice (`analyticsSlice.ts`)

**State:**
```typescript
{
  hourlyStats: { data: [], bestHour, worstHour };
  dailyWinRate: { data: [], totalDays, overallWinRate };
  symbolDistribution: { symbols: [], totalSymbols, mostTraded, mostProfitable };
  strategyDistribution: { strategies: [], totalStrategies, mostUsed, mostProfitable };
  loading: boolean;
  error: string | null;
}
```

**Thunks:**
- `fetchHourlyStats(params)` - Get hourly performance
- `fetchDailyWinRate(params)` - Get daily win rate
- `fetchSymbolDistribution(params)` - Get symbol distribution
- `fetchStrategyDistribution(params)` - Get strategy distribution

#### 6. Goals & Rules Slice (`goalsRulesSlice.ts`)

**State:**
```typescript
{
  goals: Goal[];
  rules: TradingRule[];
  loading: boolean;
  error: string | null;
}
```

**Thunks:**
- `fetchGoals()` - Get all goals
- `updateGoal({ id, payload })` - Update goal
- `fetchRules()` - Get all trading rules
- `createRule(payload)` - Create new rule
- `updateRule({ id, payload })` - Update rule
- `toggleRule(id)` - Toggle rule completion
- `deleteRule(id)` - Delete rule

#### 7. User Slice (`userSlice.ts`)

**State:**
```typescript
{
  profile: UserProfile | null;
  subscription: Subscription | null;
  savedOptions: SavedOptions | null;
  loading: boolean;
  error: string | null;
}
```

**Thunks:**
- `fetchProfile()` - Get user profile
- `updateProfile(payload)` - Update profile
- `updatePreferences(payload)` - Update preferences
- `updateNotifications(payload)` - Update notification settings
- `fetchSubscription()` - Get subscription details
- `createSubscription(payload)` - Create/update subscription
- `cancelSubscription()` - Cancel subscription
- `fetchSavedOptions()` - Get autocomplete options
- `addOption({ category, payload })` - Add new option

## Component Integration Examples

### Example 1: Login Component

```tsx
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { login, clearError } from "@/store/slices/authSlice";
import { toast } from "sonner";

export function LoginForm() {
  const dispatch = useAppDispatch();
  const { loading, error, isAuthenticated } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/app');
    }
  }, [isAuthenticated]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(login({ email, password }));
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={loading}>
        {loading ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}
```

### Example 2: Accounts View

```tsx
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchAccounts, createAccount, deleteAccount } from "@/store/slices/accountsSlice";

export function AccountsView() {
  const dispatch = useAppDispatch();
  const { accounts, loading, error } = useAppSelector((state) => state.accounts);

  useEffect(() => {
    dispatch(fetchAccounts());
  }, [dispatch]);

  const handleCreateAccount = async (accountData) => {
    const result = await dispatch(createAccount(accountData));
    if (createAccount.fulfilled.match(result)) {
      toast.success("Account created successfully");
    }
  };

  const handleDeleteAccount = async (id: string) => {
    const result = await dispatch(deleteAccount(id));
    if (deleteAccount.fulfilled.match(result)) {
      toast.success("Account deleted");
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {accounts.map(account => (
        <AccountCard 
          key={account.id} 
          account={account}
          onDelete={() => handleDeleteAccount(account.id)}
        />
      ))}
    </div>
  );
}
```

### Example 3: Trade List with Filters

```tsx
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchTrades, setFilters } from "@/store/slices/tradesSlice";

export function TradeList() {
  const dispatch = useAppDispatch();
  const { trades, loading, filters } = useAppSelector((state) => state.trades);
  const { selectedAccountId } = useAppSelector((state) => state.accounts);

  useEffect(() => {
    dispatch(fetchTrades({
      ...filters,
      accountId: selectedAccountId || undefined,
    }));
  }, [dispatch, filters, selectedAccountId]);

  const handleFilterChange = (newFilters) => {
    dispatch(setFilters({ ...filters, ...newFilters }));
  };

  return (
    <div>
      <TradeFilters filters={filters} onChange={handleFilterChange} />
      {loading ? <Spinner /> : <TradeTable trades={trades} />}
    </div>
  );
}
```

### Example 4: Dashboard with Stats

```tsx
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchStats, fetchDailyStats } from "@/store/slices/statsSlice";
import { fetchTrades } from "@/store/slices/tradesSlice";

export function Dashboard() {
  const dispatch = useAppDispatch();
  const { portfolioStats, dailyStats } = useAppSelector((state) => state.stats);
  const { trades } = useAppSelector((state) => state.trades);
  const { selectedAccountId } = useAppSelector((state) => state.accounts);

  useEffect(() => {
    const params = { 
      accountId: selectedAccountId || undefined,
      startDate: '2024-01-01',
      endDate: new Date().toISOString().split('T')[0]
    };
    
    dispatch(fetchStats(params));
    dispatch(fetchDailyStats(params));
    dispatch(fetchTrades(params));
  }, [dispatch, selectedAccountId]);

  return (
    <div>
      <StatsGrid stats={portfolioStats} />
      <PerformanceChart data={dailyStats} />
      <RecentTrades trades={trades.slice(0, 5)} />
    </div>
  );
}
```

## Best Practices

### 1. Always Use Typed Hooks

```tsx
// ✅ Good
import { useAppDispatch, useAppSelector } from "@/store/hooks";

// ❌ Bad
import { useDispatch, useSelector } from "react-redux";
```

### 2. Handle Loading and Error States

```tsx
const { data, loading, error } = useAppSelector((state) => state.slice);

if (loading) return <LoadingSpinner />;
if (error) return <ErrorMessage message={error} />;
return <DataDisplay data={data} />;
```

### 3. Clear Errors After Displaying

```tsx
useEffect(() => {
  if (error) {
    toast.error(error);
    dispatch(clearError());
  }
}, [error, dispatch]);
```

### 4. Check Thunk Results

```tsx
const result = await dispatch(createTrade(payload));
if (createTrade.fulfilled.match(result)) {
  toast.success("Trade created!");
  closeModal();
}
```

### 5. Fetch Data on Mount

```tsx
useEffect(() => {
  dispatch(fetchData());
}, [dispatch]);
```

### 6. Refetch After Mutations

```tsx
const handleCreate = async () => {
  await dispatch(createItem(data));
  dispatch(fetchItems()); // Refetch list
};
```

## Debugging

### Redux DevTools

The store is configured with Redux DevTools in development mode. Open your browser's Redux DevTools extension to:
- Inspect state
- View dispatched actions
- Time-travel debug
- Export/import state

### Console Logging

Add logging in thunks for debugging:

```typescript
export const fetchData = createAsyncThunk('slice/fetchData', async (params, { rejectWithValue }) => {
  try {
    console.log('Fetching data with params:', params);
    const response = await api.getData(params);
    console.log('Response:', response);
    return response;
  } catch (error) {
    console.error('Error fetching data:', error);
    return rejectWithValue(handleApiError(error));
  }
});
```

## Testing

### Testing Components with Redux

```tsx
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { render } from '@testing-library/react';

const createMockStore = (initialState) => {
  return configureStore({
    reducer: {
      auth: authReducer,
      // ... other reducers
    },
    preloadedState: initialState,
  });
};

test('renders component', () => {
  const store = createMockStore({
    auth: { user: null, loading: false, error: null },
  });

  render(
    <Provider store={store}>
      <YourComponent />
    </Provider>
  );
});
```

## Migration from Hooks

If you have existing custom hooks (like `useAccounts.ts`), you can gradually migrate:

1. Keep the old hook for backward compatibility
2. Update one component at a time to use Redux
3. Remove the old hook once all components are migrated

Example transition:

```tsx
// Old way
const { accounts, addAccount } = useAccounts();

// New way
const dispatch = useAppDispatch();
const { accounts } = useAppSelector((state) => state.accounts);
const addAccount = (data) => dispatch(createAccount(data));
```

## Troubleshooting

### Common Issues

**Issue:** Token not being sent with requests
- Check that token is in localStorage under key 'idToken'
- Verify axios interceptor is correctly set up

**Issue:** 401 Unauthorized errors
- Token may have expired
- Check that refresh token logic is working
- Ensure API_URL environment variable is correct

**Issue:** State not updating
- Verify thunk is being dispatched
- Check Redux DevTools for action flow
- Ensure reducer is handling the action correctly

**Issue:** Type errors with TypeScript
- Use typed hooks: `useAppDispatch`, `useAppSelector`
- Ensure RootState type is correctly exported
- Check that payload types match API response types

---

For more information, refer to:
- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
- [COPILOT_CONTEXT.md](../../COPILOT_CONTEXT.md) for API endpoint details
