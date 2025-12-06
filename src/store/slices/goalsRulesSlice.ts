import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { goalsApi, rulesApi, Goal, TradingRule, UpdateGoalPayload, CreateRulePayload, UpdateRulePayload } from '@/lib/api';
import { handleApiError } from '@/lib/api';

export interface GoalsRulesState {
  goals: Goal[];
  rules: TradingRule[];
  loading: boolean;
  error: string | null;
}

const initialState: GoalsRulesState = {
  goals: [],
  rules: [],
  loading: false,
  error: null,
};

// Async thunks - Goals
export const fetchGoals = createAsyncThunk(
  'goalsRules/fetchGoals',
  async (_, { rejectWithValue }) => {
    try {
      const response = await goalsApi.getGoals();
      return response.goals;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const updateGoal = createAsyncThunk(
  'goalsRules/updateGoal',
  async ({ id, payload }: { id: string; payload: UpdateGoalPayload }, { rejectWithValue }) => {
    try {
      const response = await goalsApi.updateGoal(id, payload);
      return response.goal;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Async thunks - Rules
export const fetchRules = createAsyncThunk(
  'goalsRules/fetchRules',
  async (_, { rejectWithValue }) => {
    try {
      const response = await rulesApi.getRules();
      return response.rules;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const createRule = createAsyncThunk(
  'goalsRules/createRule',
  async (payload: CreateRulePayload, { rejectWithValue }) => {
    try {
      const response = await rulesApi.createRule(payload);
      return response.rule;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const updateRule = createAsyncThunk(
  'goalsRules/updateRule',
  async ({ id, payload }: { id: string; payload: UpdateRulePayload }, { rejectWithValue }) => {
    try {
      const response = await rulesApi.updateRule(id, payload);
      return response.rule;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const toggleRule = createAsyncThunk(
  'goalsRules/toggleRule',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await rulesApi.toggleRule(id);
      return response.rule;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const deleteRule = createAsyncThunk(
  'goalsRules/deleteRule',
  async (id: string, { rejectWithValue }) => {
    try {
      await rulesApi.deleteRule(id);
      return id;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Slice
const goalsRulesSlice = createSlice({
  name: 'goalsRules',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Goals
    builder
      .addCase(fetchGoals.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGoals.fulfilled, (state, action) => {
        state.loading = false;
        state.goals = action.payload;
        state.error = null;
      })
      .addCase(fetchGoals.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update Goal
    builder
      .addCase(updateGoal.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateGoal.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.goals.findIndex(goal => goal.goalId === action.payload.goalId);
        if (index !== -1) {
          state.goals[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(updateGoal.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Rules
    builder
      .addCase(fetchRules.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRules.fulfilled, (state, action) => {
        state.loading = false;
        state.rules = action.payload;
        state.error = null;
      })
      .addCase(fetchRules.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create Rule
    builder
      .addCase(createRule.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createRule.fulfilled, (state, action) => {
        state.loading = false;
        state.rules.push(action.payload);
        state.error = null;
      })
      .addCase(createRule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update Rule
    builder
      .addCase(updateRule.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateRule.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.rules.findIndex(rule => rule.ruleId === action.payload.ruleId);
        if (index !== -1) {
          state.rules[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(updateRule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Toggle Rule
    builder
      .addCase(toggleRule.pending, (state) => {
        state.error = null;
      })
      .addCase(toggleRule.fulfilled, (state, action) => {
        const index = state.rules.findIndex(rule => rule.ruleId === action.payload.ruleId);
        if (index !== -1) {
          state.rules[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(toggleRule.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Delete Rule
    builder
      .addCase(deleteRule.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteRule.fulfilled, (state, action) => {
        state.loading = false;
        state.rules = state.rules.filter(rule => rule.ruleId !== action.payload);
        state.error = null;
      })
      .addCase(deleteRule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = goalsRulesSlice.actions;
export default goalsRulesSlice.reducer;
