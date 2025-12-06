import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { 
  userApi, 
  subscriptionsApi, 
  optionsApi, 
  UserProfile, 
  UpdateProfilePayload, 
  UpdatePreferencesPayload, 
  UpdateNotificationsPayload,
  Subscription,
  CreateSubscriptionPayload,
  SavedOptions,
  AddOptionPayload
} from '@/lib/api';
import { handleApiError } from '@/lib/api';

export interface UserState {
  profile: UserProfile['user'] | null;
  subscription: Subscription | null;
  savedOptions: SavedOptions | null;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  profile: null,
  subscription: null,
  savedOptions: null,
  loading: false,
  error: null,
};

// Async thunks - Profile
export const fetchProfile = createAsyncThunk(
  'user/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await userApi.getProfile();
      return response.user;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const updateProfile = createAsyncThunk(
  'user/updateProfile',
  async (payload: UpdateProfilePayload, { rejectWithValue }) => {
    try {
      const response = await userApi.updateProfile(payload);
      return response.user;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const updatePreferences = createAsyncThunk(
  'user/updatePreferences',
  async (payload: UpdatePreferencesPayload, { rejectWithValue }) => {
    try {
      const response = await userApi.updatePreferences(payload);
      return response.user;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const updateNotifications = createAsyncThunk(
  'user/updateNotifications',
  async (payload: UpdateNotificationsPayload, { rejectWithValue }) => {
    try {
      const response = await userApi.updateNotifications(payload);
      return response.user;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Async thunks - Subscription
export const fetchSubscription = createAsyncThunk(
  'user/fetchSubscription',
  async (_, { rejectWithValue }) => {
    try {
      const response = await subscriptionsApi.getSubscription();
      return response.subscription;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const createSubscription = createAsyncThunk(
  'user/createSubscription',
  async (payload: CreateSubscriptionPayload, { rejectWithValue }) => {
    try {
      const response = await subscriptionsApi.createSubscription(payload);
      return response;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const cancelSubscription = createAsyncThunk(
  'user/cancelSubscription',
  async (_, { rejectWithValue }) => {
    try {
      await subscriptionsApi.cancelSubscription();
      return;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Async thunks - Saved Options
export const fetchSavedOptions = createAsyncThunk(
  'user/fetchSavedOptions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await optionsApi.getOptions();
      return response;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const addOption = createAsyncThunk(
  'user/addOption',
  async ({ category, payload }: { category: string; payload: AddOptionPayload }, { rejectWithValue }) => {
    try {
      const response = await optionsApi.addOption(category, payload);
      return response;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Slice
const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Profile
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
        state.error = null;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update Profile
    builder
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
        state.error = null;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update Preferences
    builder
      .addCase(updatePreferences.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updatePreferences.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
        state.error = null;
      })
      .addCase(updatePreferences.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update Notifications
    builder
      .addCase(updateNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
        state.error = null;
      })
      .addCase(updateNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Subscription
    builder
      .addCase(fetchSubscription.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSubscription.fulfilled, (state, action) => {
        state.loading = false;
        state.subscription = action.payload;
        state.error = null;
      })
      .addCase(fetchSubscription.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create Subscription
    builder
      .addCase(createSubscription.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createSubscription.fulfilled, (state, action) => {
        state.loading = false;
        state.subscription = action.payload.subscription;
        state.error = null;
      })
      .addCase(createSubscription.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Cancel Subscription
    builder
      .addCase(cancelSubscription.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cancelSubscription.fulfilled, (state) => {
        state.loading = false;
        if (state.subscription) {
          state.subscription.status = 'cancelled';
        }
        state.error = null;
      })
      .addCase(cancelSubscription.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Saved Options
    builder
      .addCase(fetchSavedOptions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSavedOptions.fulfilled, (state, action) => {
        state.loading = false;
        state.savedOptions = action.payload;
        state.error = null;
      })
      .addCase(fetchSavedOptions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Add Option
    builder
      .addCase(addOption.pending, (state) => {
        state.error = null;
      })
      .addCase(addOption.fulfilled, (state, action) => {
        state.savedOptions = action.payload;
        state.error = null;
      })
      .addCase(addOption.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = userSlice.actions;
export default userSlice.reducer;
