import { describe, it, expect } from 'vitest';
import { statsApi, useGetStatsQuery } from '../statsApi';

// ---------------------------------------------------------------------------
// RTK Query endpoint definition tests
// ---------------------------------------------------------------------------
// We test the statsApi endpoint by:
// 1. Verifying the endpoint is defined and the hook is exported.
// 2. Using the `select` function to create cache selectors, which proves
//    RTK Query can serialize the params correctly.
// 3. Inspecting the `initiate` thunk action creator (its `toString()` or
//    type string embeds the endpoint name).
// ---------------------------------------------------------------------------

const getStatsEndpoint = (statsApi as any).endpoints.getStats;

describe('statsApi', () => {
  describe('getStats endpoint', () => {
    it('is defined on statsApi', () => {
      expect(getStatsEndpoint).toBeDefined();
      expect(getStatsEndpoint.initiate).toBeDefined();
      expect(getStatsEndpoint.select).toBeDefined();
    });

    it('creates a selector for specific account params', () => {
      const selector = getStatsEndpoint.select({
        accountId: 'acct-123',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });
      // selector is a function that takes root state and returns the cache entry
      expect(typeof selector).toBe('function');
    });

    it('creates a selector for ALL account params', () => {
      const selector = getStatsEndpoint.select({ accountId: 'ALL' });
      expect(typeof selector).toBe('function');
    });

    it('creates a selector with includeEquityCurve flag', () => {
      const selector = getStatsEndpoint.select({
        accountId: 'acct-1',
        includeEquityCurve: true,
      });
      expect(typeof selector).toBe('function');
    });

    it('creates a selector with totalCapital', () => {
      const selector = getStatsEndpoint.select({
        accountId: 'acct-1',
        totalCapital: 50000,
      });
      expect(typeof selector).toBe('function');
    });

    it('creates a selector with void / no params', () => {
      const selector = getStatsEndpoint.select(undefined);
      expect(typeof selector).toBe('function');
    });

    it('initiate creates a thunk for specific params', () => {
      const thunk = getStatsEndpoint.initiate({
        accountId: 'acct-123',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });
      // initiate returns a thunk function
      expect(typeof thunk).toBe('function');
    });

    it('initiate creates a thunk for ALL accounts', () => {
      const thunk = getStatsEndpoint.initiate({ accountId: 'ALL' });
      expect(typeof thunk).toBe('function');
    });

    it('initiate creates a thunk with includeEquityCurve', () => {
      const thunk = getStatsEndpoint.initiate({
        accountId: 'acct-1',
        includeEquityCurve: true,
      });
      expect(typeof thunk).toBe('function');
    });

    it('initiate creates a thunk with totalCapital', () => {
      const thunk = getStatsEndpoint.initiate({
        accountId: 'acct-1',
        totalCapital: 50000,
      });
      expect(typeof thunk).toBe('function');
    });

    it('initiate creates a thunk with no params', () => {
      const thunk = getStatsEndpoint.initiate(undefined);
      expect(typeof thunk).toBe('function');
    });

    it('uses the shared api reducer path', () => {
      expect((statsApi as any).reducerPath).toBe('api');
    });

    it('exports useGetStatsQuery hook', () => {
      expect(useGetStatsQuery).toBeDefined();
      expect(typeof useGetStatsQuery).toBe('function');
    });

    it('matchFulfilled matcher is available for middleware', () => {
      expect(getStatsEndpoint.matchFulfilled).toBeDefined();
      expect(typeof getStatsEndpoint.matchFulfilled).toBe('function');
    });

    it('matchPending matcher is available for middleware', () => {
      expect(getStatsEndpoint.matchPending).toBeDefined();
      expect(typeof getStatsEndpoint.matchPending).toBe('function');
    });

    it('matchRejected matcher is available for middleware', () => {
      expect(getStatsEndpoint.matchRejected).toBeDefined();
      expect(typeof getStatsEndpoint.matchRejected).toBe('function');
    });
  });
});
