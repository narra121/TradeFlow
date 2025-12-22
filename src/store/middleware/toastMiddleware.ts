import { Middleware } from '@reduxjs/toolkit';
import { toast } from 'sonner';
import { isFulfilled, isRejectedWithValue } from '@reduxjs/toolkit';

// Type for Redux actions
interface ReduxAction {
  type: string;
  payload?: any;
  meta?: any;
}

// RTK Query endpoints to skip toast notifications (queries only, not mutations)
const skipToastEndpoints = [
  'getProfile',
  'getSubscription',
  'getSavedOptions',
  'getStats',
  'getDailyStats',
  'getHourlyStats',
  'getDailyWinRate',
  'getSymbolDistribution',
  'getStrategyDistribution',
  'getGoals',
  'getRules',
  'getTrades',
  'getAccounts',
  'login', // Skip login toasts, handled in auth component
];

// Endpoint-specific success messages (for RTK Query mutations)
const endpointSuccessMessages: Record<string, string> = {
  'createTrade': 'Trade created successfully',
  'updateTrade': 'Trade updated successfully',
  'deleteTrade': 'Trade deleted successfully',
  'bulkDeleteTrades': 'Trades deleted successfully',
  'bulkImportTrades': 'Trades imported successfully',
  'createAccount': 'Account created successfully',
  'updateAccount': 'Account updated successfully',
  'updateAccountStatus': 'Account status updated',
  'deleteAccount': 'Account deleted successfully',
  'updateGoal': 'Goal updated successfully',
  'createRule': 'Rule created successfully',
  'updateRule': 'Rule updated successfully',
  'toggleRule': 'Rule toggled successfully',
  'deleteRule': 'Rule deleted successfully',
  'updateProfile': 'Profile updated successfully',
  'updatePreferences': 'Preferences updated successfully',
  'updateNotifications': 'Notifications updated successfully',
  'createSubscription': 'Subscription created successfully',
  'cancelSubscription': 'Subscription cancelled successfully',
  'addOption': 'Option saved successfully',
  'updateSavedOptions': 'Options updated successfully',
  'signup': 'Account created! Please check your email to verify.',
  'confirmSignup': 'Email verified successfully!',
  'forgotPassword': 'Reset code sent to your email',
  'resetPassword': 'Password reset successfully',
  'logoutAll': 'Logged out from all devices',
};

export const toastMiddleware: Middleware = () => (next) => (action: ReduxAction) => {
  const result = next(action);

  // Handle RTK Query mutations and queries
  if (action.type && typeof action.type === 'string') {
    const actionType = action.type;
    
    // Check if this is an RTK Query action
    const isRTKQuery = actionType.startsWith('api/executeQuery') || actionType.startsWith('api/executeMutation');
    
    if (isRTKQuery && action.meta?.arg) {
      const endpointName = action.meta.arg.endpointName;
      
      // Skip toasts for specific endpoints (queries)
      if (skipToastEndpoints.includes(endpointName)) {
        return result;
      }
      
      // Handle successful responses (fulfilled)
      if (isFulfilled(action)) {
        // Get message from API response (_apiMessage) or use default
        let message = endpointSuccessMessages[endpointName];
        
        if (action.payload && typeof action.payload === 'object') {
          // Check for _apiMessage (hidden property from API response)
          if ((action.payload as any)._apiMessage) {
            message = (action.payload as any)._apiMessage;
          } else if ('message' in action.payload && typeof (action.payload as any).message === 'string') {
            message = (action.payload as any).message;
          }
        }
        
        if (message) {
          toast.success(message);
        }
      }
      
      // Handle errors (rejected)
      if (isRejectedWithValue(action)) {
        let errorMessage = 'An error occurred';
        
        if (action.payload) {
          const payload = action.payload as any;
          
          // Extract error message from various possible structures
          // Priority: data.message > data.error.message > data.error > data > message > error
          if (payload.data) {
            if (typeof payload.data === 'string') {
              errorMessage = payload.data;
            } else if (typeof payload.data === 'object') {
              if (payload.data.message && typeof payload.data.message === 'string') {
                errorMessage = payload.data.message;
              } else if (payload.data.error) {
                if (typeof payload.data.error === 'object' && payload.data.error.message) {
                  errorMessage = payload.data.error.message;
                } else if (typeof payload.data.error === 'string') {
                  errorMessage = payload.data.error;
                }
              }
            }
          } else if (payload.message && typeof payload.message === 'string') {
            errorMessage = payload.message;
          } else if (payload.error) {
            if (typeof payload.error === 'object' && payload.error.message) {
              errorMessage = payload.error.message;
            } else if (typeof payload.error === 'string') {
              errorMessage = payload.error;
            }
          }
        }
        
        // Also check action.error for RTK Query errors
        if (errorMessage === 'An error occurred' && action.error?.message) {
          errorMessage = action.error.message;
        }
        
        // Skip auth errors - handled in auth component
        if (endpointName !== 'login' && endpointName !== 'signup') {
          toast.error(errorMessage);
        }
      }
      
      // Handle generic errors (rejected but not with value)
      if (action.type.includes('rejected') && !isRejectedWithValue(action)) {
        let errorMessage = 'An error occurred';
        
        // Try to get error message from action.error
        if (action.error?.message) {
          errorMessage = action.error.message;
        } else if (action.payload && typeof action.payload === 'string') {
          errorMessage = action.payload;
        }
        
        // Skip auth errors - handled in auth component
        if (endpointName !== 'login' && endpointName !== 'signup') {
          toast.error(errorMessage);
        }
      }
    }
  }

  return result;
};
