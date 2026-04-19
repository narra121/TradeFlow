import { describe, it, expect } from 'vitest';
import { sha256Hex } from '../hash';

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
});
