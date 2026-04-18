import { Middleware } from '@reduxjs/toolkit';
import { toast } from 'sonner';
import { isFulfilled, isRejectedWithValue } from '@reduxjs/toolkit';

// Type for Redux actions
interface ReduxAction {
  type: string;
  payload?: any;
  meta?: any;
  error?: {
    message?: string;
    [key: string]: any;
  };
}

let lastToastTime = 0;
const TOAST_DEBOUNCE_MS = 300;

function showToast(type: 'success' | 'error', message: string) {
  const now = Date.now();
  if (now - lastToastTime < TOAST_DEBOUNCE_MS) return;
  lastToastTime = now;
  toast[type](message);
}

export function _resetToastDebounce() {
  lastToastTime = 0;
}

// RTK Query endpoints to skip toast notifications (queries only, not mutations)
const skipToastEndpoints = [
  'getProfile',
  'getSubscription',
  'getSavedOptions',
  'getHourlyStats',
  'getDailyWinRate',
  'getSymbolDistribution',
  'getStrategyDistribution',
  'getRules',
  'getRulesAndGoals',
  'getGoalsProgress',
  'getTrades',
  'getAccounts',
  'getAdConfig',
  'getStats',
  'getPlans',
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
  'pauseSubscription': 'Subscription paused successfully',
  'resumeSubscription': 'Subscription resumed successfully',
  'undoCancellation': 'Cancellation undone - your subscription will continue',
  'updateSavedOptions': 'Options updated successfully',
  'signup': 'Account created! Please check your email to verify.',
  'confirmSignup': 'Email verified successfully!',
  'forgotPassword': 'Reset code sent to your email',
  'resetPassword': 'Password reset successfully',
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
          showToast('success', message);
        }
      }
      
      // Handle errors (rejected)
      if (isRejectedWithValue(action) || action.type.includes('rejected')) {
        let errorMessage = 'An error occurred';
        let errorDetails: string[] = [];

        // RTK Query error structure: payload.data contains the error message
        if (action.payload) {
          const payload = action.payload as any;

          // Priority: payload.data (RTK Query error) > payload.message > action.error.message
          if (payload.data) {
            if (typeof payload.data === 'string') {
              errorMessage = payload.data;
            } else if (typeof payload.data === 'object') {
              if (payload.data.message) {
                errorMessage = payload.data.message;
              }
              // Extract specific validation errors from the errors array
              const errors = payload.data.errors || payload.data.details;
              if (Array.isArray(errors) && errors.length > 0) {
                errorDetails = errors.map((e: any) => {
                  const field = e.field?.replace(/^[#/]+/, '').replace(/\//g, ' ') || '';
                  const msg = e.message || '';
                  return field ? `${field}: ${msg}` : msg;
                });
              }
            }
          } else if (payload.error && typeof payload.error === 'string') {
            errorMessage = payload.error;
          } else if (payload.message && typeof payload.message === 'string') {
            errorMessage = payload.message;
          }
        }

        // Fallback to action.error.message
        if (errorMessage === 'An error occurred' && action.error?.message) {
          errorMessage = action.error.message;
        }

        // Skip auth errors - handled in auth component
        if (endpointName !== 'login' && endpointName !== 'signup') {
          if (errorDetails.length > 0) {
            showToast('error', `${errorMessage}: ${errorDetails.join(', ')}`);
          } else {
            showToast('error', errorMessage);
          }
        }
      }
    }
  }

  return result;
};
