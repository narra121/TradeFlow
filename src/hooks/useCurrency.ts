import { useState, useEffect } from 'react';

type Currency = 'INR' | 'USD';

const CACHE_KEY = 'tradequt_detected_currency';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CachedCurrency {
  currency: Currency;
  timestamp: number;
}

/**
 * Detect user's currency based on IP geolocation.
 * India → INR, everywhere else → USD.
 * Caches result in localStorage for 7 days.
 */
export const useCurrency = () => {
  const [currency, setCurrency] = useState<Currency>(() => {
    // Check cache first
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed: CachedCurrency = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_DURATION) {
          return parsed.currency;
        }
      }
    } catch {
      // Ignore cache errors
    }
    return 'USD'; // Default until detection completes
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Skip if we have a fresh cache
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed: CachedCurrency = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_DURATION) {
          setCurrency(parsed.currency);
          return;
        }
      }
    } catch {
      // Continue to detect
    }

    const detectCurrency = async () => {
      setLoading(true);
      try {
        // Try multiple geolocation APIs as fallbacks
        let countryCode = '';
        try {
          const response = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
          if (response.ok) {
            const data = await response.json();
            countryCode = data.country_code || '';
          }
        } catch {
          // Fallback API
          try {
            const response = await fetch('https://ip-api.com/json/?fields=countryCode', { signal: AbortSignal.timeout(5000) });
            if (response.ok) {
              const data = await response.json();
              countryCode = data.countryCode || '';
            }
          } catch {
            // Both failed
          }
        }

        const detected: Currency = countryCode === 'IN' ? 'INR' : 'USD';

        setCurrency(detected);

        // Cache the result
        const cacheEntry: CachedCurrency = { currency: detected, timestamp: Date.now() };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheEntry));
      } catch (error) {
        console.warn('Currency detection failed, defaulting to USD:', error);
        setCurrency('USD');
      } finally {
        setLoading(false);
      }
    };

    detectCurrency();
  }, []);

  return { currency, loading };
};
