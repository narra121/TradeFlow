import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AccountsState {
  selectedAccountId: string | null;
}

const initialState: AccountsState = {
  selectedAccountId: null,
};

const accountsSlice = createSlice({
  name: 'accounts',
  initialState,
  reducers: {
    setSelectedAccount: (state, action: PayloadAction<string | null>) => {
      state.selectedAccountId = action.payload;
    },
  },
});

export const { setSelectedAccount } = accountsSlice.actions;
export default accountsSlice.reducer;
