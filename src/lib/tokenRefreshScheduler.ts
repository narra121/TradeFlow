import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.tradeflow.com/v1';

// JWT token expiration time in seconds (default: 3600 = 1 hour)
// Cognito IdTokens typically expire in 1 hour
const TOKEN_EXPIRY_SECONDS = 3600;
// Refresh 2 minutes before expiration
const REFRESH_BEFORE_EXPIRY_MS = 2 * 60 * 1000;

class TokenRefreshScheduler {
  private refreshTimeoutId: NodeJS.Timeout | null = null;
  private isScheduled = false;
  private isRefreshing = false;
  private hasFailedRecently = false;

  /**
   * Parse JWT token to get expiration time
   */
  private parseJWT(token: string): { exp?: number } | null {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Failed to parse JWT token:', error);
      return null;
    }
  }

  /**
   * Get token expiration time in milliseconds
   */
  private getTokenExpiryTime(token: string): number | null {
    const decoded = this.parseJWT(token);
    if (decoded && decoded.exp) {
      // exp is in seconds, convert to milliseconds
      return decoded.exp * 1000;
    }
    return null;
  }

  /**
   * Refresh the access token
   */
  private async refreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      console.warn('No refresh token available');
      this.stop();
      return false;
    }

    try {
      console.log('[TokenRefreshScheduler] Refreshing token...');
      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refreshToken: refreshToken
      });

      // Backend returns envelope format: { data: { IdToken, ... }, error: null }
      const tokens = response.data?.data || response.data;
      const newToken = tokens.IdToken;
      
      if (newToken) {
        localStorage.setItem('idToken', newToken);
        console.log('[TokenRefreshScheduler] Token refreshed successfully');
        
        // Schedule the next refresh
        this.scheduleRefresh(newToken);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[TokenRefreshScheduler] Failed to refresh token:', error);
      this.stop();
      
      // Clear tokens and dispatch unauthorized event
      localStorage.removeItem('idToken');
      localStorage.removeItem('refreshToken');
      window.dispatchEvent(new CustomEvent('unauthorized'));
      
      return false;
    }
  }

  /**
   * Schedule the next token refresh
   */
  private scheduleRefresh(token: string): void {
    // Clear existing timeout
    if (this.refreshTimeoutId) {
      clearTimeout(this.refreshTimeoutId);
      this.refreshTimeoutId = null;
    }

    const expiryTime = this.getTokenExpiryTime(token);
    
    if (!expiryTime) {
      // If we can't parse the expiry, use default time
      const defaultRefreshTime = (TOKEN_EXPIRY_SECONDS * 1000) - REFRESH_BEFORE_EXPIRY_MS;
      console.log(`[TokenRefreshScheduler] Using default refresh time: ${defaultRefreshTime / 1000}s`);
      
      this.refreshTimeoutId = setTimeout(() => {
        this.refreshToken();
      }, defaultRefreshTime);
      
      this.isScheduled = true;
      return;
    }

    const now = Date.now();
    const timeUntilExpiry = expiryTime - now;
    const timeUntilRefresh = timeUntilExpiry - REFRESH_BEFORE_EXPIRY_MS;

    // If token is already expired or will expire very soon, refresh immediately
    if (timeUntilRefresh <= 0) {
      console.log('[TokenRefreshScheduler] Token expired or expiring soon, refreshing immediately');
      this.refreshToken();
      return;
    }

    console.log(`[TokenRefreshScheduler] Scheduled refresh in ${Math.round(timeUntilRefresh / 1000)}s (${new Date(now + timeUntilRefresh).toLocaleTimeString()})`);

    this.refreshTimeoutId = setTimeout(() => {
      this.refreshToken();
    }, timeUntilRefresh);

    this.isScheduled = true;
  }

  /**
   * Start the token refresh scheduler
   */
  public start(): void {
    const token = localStorage.getItem('idToken');
    
    if (!token) {
      console.warn('[TokenRefreshScheduler] No token found, scheduler not started');
      return;
    }

    if (this.isScheduled) {
      console.log('[TokenRefreshScheduler] Already scheduled, skipping');
      return;
    }

    console.log('[TokenRefreshScheduler] Starting token refresh scheduler');
    this.scheduleRefresh(token);
  }

  /**
   * Stop the token refresh scheduler
   */
  public stop(): void {
    if (this.refreshTimeoutId) {
      clearTimeout(this.refreshTimeoutId);
      this.refreshTimeoutId = null;
    }
    this.isScheduled = false;
    this.hasFailedRecently = false;
    console.log('[TokenRefreshScheduler] Token refresh scheduler stopped');
  }

  /**
   * Check if scheduler is running
   */
  public isRunning(): boolean {
    return this.isScheduled;
  }
}

// Export singleton instance
export const tokenRefreshScheduler = new TokenRefreshScheduler();
