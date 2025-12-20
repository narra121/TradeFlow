import { Middleware } from '@reduxjs/toolkit';
import { toast } from 'sonner';

// Type for Redux actions
interface ReduxAction {
  type: string;
  payload?: any;
}

// Actions to skip toast notifications
const skipToastActions = [
  'auth/login/fulfilled',
  'auth/login/rejected',
  'trades/fetchTrades/fulfilled',
  'trades/fetchTrades/rejected',
  'accounts/fetchAccounts/fulfilled',
  'accounts/fetchAccounts/rejected',
  'stats/fetchStats/fulfilled',
  'stats/fetchStats/rejected',
  'stats/fetchDailyStats/fulfilled',
  'stats/fetchDailyStats/rejected',
  'analytics/fetchHourlyStats/fulfilled',
  'analytics/fetchHourlyStats/rejected',
  'analytics/fetchDailyWinRate/fulfilled',
  'analytics/fetchDailyWinRate/rejected',
  'analytics/fetchSymbolDistribution/fulfilled',
  'analytics/fetchSymbolDistribution/rejected',
  'analytics/fetchStrategyDistribution/fulfilled',
  'analytics/fetchStrategyDistribution/rejected',
  'goalsRules/fetchGoals/fulfilled',
  'goalsRules/fetchGoals/rejected',
  'goalsRules/fetchRules/fulfilled',
  'goalsRules/fetchRules/rejected',
  'user/fetchProfile/fulfilled',
  'user/fetchProfile/rejected',
  'user/fetchSubscription/fulfilled',
  'user/fetchSubscription/rejected',
  'user/fetchSavedOptions/fulfilled',
  'user/fetchSavedOptions/rejected',
];

// Success messages for specific actions
const successMessages: Record<string, string> = {
  'trades/createTrade/fulfilled': 'Trade created successfully',
  'trades/updateTrade/fulfilled': 'Trade updated successfully',
  'trades/deleteTrade/fulfilled': 'Trade deleted successfully',
  'trades/bulkImportTrades/fulfilled': 'Trades imported successfully',
  'accounts/createAccount/fulfilled': 'Account created successfully',
  'accounts/updateAccount/fulfilled': 'Account updated successfully',
  'accounts/updateAccountStatus/fulfilled': 'Account status updated',
  'accounts/deleteAccount/fulfilled': 'Account deleted successfully',
  'goalsRules/updateGoal/fulfilled': 'Goal updated successfully',
  'goalsRules/createRule/fulfilled': 'Rule created successfully',
  'goalsRules/updateRule/fulfilled': 'Rule updated successfully',
  'goalsRules/toggleRule/fulfilled': 'Rule toggled successfully',
  'goalsRules/deleteRule/fulfilled': 'Rule deleted successfully',
  'user/updateProfile/fulfilled': 'Profile updated successfully',
  'user/updatePreferences/fulfilled': 'Preferences updated successfully',
  'user/updateNotifications/fulfilled': 'Notifications updated successfully',
  'user/createSubscription/fulfilled': 'Subscription created successfully',
  'user/cancelSubscription/fulfilled': 'Subscription cancelled successfully',
  'user/addOption/fulfilled': 'Option saved successfully',
  'auth/signup/fulfilled': 'Account created! Please check your email to verify.',
  'auth/confirmSignup/fulfilled': 'Email verified successfully!',
  'auth/forgotPassword/fulfilled': 'Reset code sent to your email',
  'auth/resetPassword/fulfilled': 'Password reset successfully',
  'auth/logoutAll/fulfilled': 'Logged out from all devices',
  'auth/deleteAccount/fulfilled': 'Account deleted successfully',
};

export const toastMiddleware: Middleware = () => (next) => (action: ReduxAction) => {
  // Check if this is an async action (fulfilled or rejected)
  if (action.type && typeof action.type === 'string') {
    const actionType = action.type;

    // Skip toast for certain fetch actions
    if (skipToastActions.includes(actionType)) {
      return next(action);
    }

    // Handle fulfilled actions (success)
    if (actionType.endsWith('/fulfilled')) {
      const message = successMessages[actionType];
      if (message) {
        toast.success(message);
      }
    }

    // Handle rejected actions (error)
    if (actionType.endsWith('/rejected')) {
      // Extract error message from payload
      let errorMessage = 'An error occurred';
      
      if (action.payload) {
        if (typeof action.payload === 'string') {
          errorMessage = action.payload;
        } else if (typeof action.payload === 'object' && action.payload !== null) {
          // Handle RTK Query error object structure
          if ('data' in action.payload && typeof action.payload.data === 'string') {
            errorMessage = action.payload.data;
          } else if ('error' in action.payload && typeof action.payload.error === 'string') {
            errorMessage = action.payload.error;
          } else if ('message' in action.payload && typeof action.payload.message === 'string') {
            errorMessage = action.payload.message;
          }
        }
      }
      
      // Skip auth errors - they're handled in the auth component
      if (!actionType.startsWith('auth/')) {
        toast.error(errorMessage);
      }
    }
  }

  return next(action);
};
