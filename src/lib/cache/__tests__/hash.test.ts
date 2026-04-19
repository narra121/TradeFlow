import { describe, it, expect } from 'vitest';
import { sha256Hex, computeLocalMonthHash } from '../hash';

describe('cache/hash', () => {
  describe('sha256Hex', () => {
    it('produces a 64-character hex string', async () => {
      const result = await sha256Hex('hello');
      expect(result).toHaveLength(64);
      expect(result).toMatch(/^[0-9a-f]{64}$/);
    });

    it('is deterministic (same input gives same output)', async () => {
      const r1 = await sha256Hex('test-input');
      const r2 = await sha256Hex('test-input');
      expect(r1).toBe(r2);
    });

    it('produces different hashes for different inputs', async () => {
      const r1 = await sha256Hex('input-a');
      const r2 = await sha256Hex('input-b');
      expect(r1).not.toBe(r2);
    });

    it('handles empty string', async () => {
      const result = await sha256Hex('');
      expect(result).toHaveLength(64);
      // SHA-256 of empty string is well-known
      expect(result).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });

    it('handles unicode characters', async () => {
      const result = await sha256Hex('hello 世界 🌍');
      expect(result).toHaveLength(64);
      expect(result).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('computeLocalMonthHash', () => {
    it('computes deterministic hash from day hashes', async () => {
      const dayHashes = [
        { date: '2026-04-02', tradeHash: 'hash2' },
        { date: '2026-04-01', tradeHash: 'hash1' },
      ];
      const result = await computeLocalMonthHash(dayHashes);
      expect(result).toHaveLength(64);

      // Same input in different order should give same result (sorts by date)
      const result2 = await computeLocalMonthHash([...dayHashes].reverse());
      expect(result2).toBe(result);
    });

    it('produces different hash when a day hash changes', async () => {
      const h1 = await computeLocalMonthHash([{ date: '2026-04-01', tradeHash: 'aaa' }]);
      const h2 = await computeLocalMonthHash([{ date: '2026-04-01', tradeHash: 'bbb' }]);
      expect(h1).not.toBe(h2);
    });

    it('produces different hash when a date changes', async () => {
      const h1 = await computeLocalMonthHash([{ date: '2026-04-01', tradeHash: 'aaa' }]);
      const h2 = await computeLocalMonthHash([{ date: '2026-04-02', tradeHash: 'aaa' }]);
      expect(h1).not.toBe(h2);
    });

    it('handles single day hash', async () => {
      const result = await computeLocalMonthHash([{ date: '2026-04-15', tradeHash: 'abc123' }]);
      expect(result).toHaveLength(64);

      // Should be SHA-256 of "2026-04-15|abc123"
      const expected = await sha256Hex('2026-04-15|abc123');
      expect(result).toBe(expected);
    });

    it('joins with correct separators (date|hash and ||)', async () => {
      const dayHashes = [
        { date: '2026-04-01', tradeHash: 'h1' },
        { date: '2026-04-02', tradeHash: 'h2' },
      ];
      const result = await computeLocalMonthHash(dayHashes);

      // Manually compute expected: "2026-04-01|h1||2026-04-02|h2"
      const expected = await sha256Hex('2026-04-01|h1||2026-04-02|h2');
      expect(result).toBe(expected);
    });

    it('does not mutate the input array', async () => {
      const dayHashes = [
        { date: '2026-04-02', tradeHash: 'hash2' },
        { date: '2026-04-01', tradeHash: 'hash1' },
      ];
      const original = [...dayHashes];
      await computeLocalMonthHash(dayHashes);
      expect(dayHashes).toEqual(original);
    });

    it('handles empty array', async () => {
      const result = await computeLocalMonthHash([]);
      // SHA-256 of empty string
      expect(result).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });
  });
});
