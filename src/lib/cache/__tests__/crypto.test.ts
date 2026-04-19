import { describe, it, expect } from 'vitest';
import { deriveKey, encrypt, decrypt } from '../crypto';

describe('cache/crypto', () => {
  describe('deriveKey', () => {
    it('returns a CryptoKey for a given userId', async () => {
      const key = await deriveKey('user-123');
      expect(key).toBeDefined();
      expect(key.algorithm).toEqual({ name: 'AES-GCM', length: 256 });
      expect(key.usages).toContain('encrypt');
      expect(key.usages).toContain('decrypt');
    });

    it('produces different keys for different userIds', async () => {
      const key1 = await deriveKey('user-aaa');
      const key2 = await deriveKey('user-bbb');

      // Encrypt the same data with both keys - results should differ
      const data = { test: 'hello' };
      const enc1 = await encrypt(key1, data);
      const enc2 = await encrypt(key2, data);

      // The encrypted outputs should not be byte-identical (different key + different IV)
      const arr1 = new Uint8Array(enc1);
      const arr2 = new Uint8Array(enc2);
      const identical =
        arr1.length === arr2.length &&
        arr1.every((b, i) => b === arr2[i]);
      expect(identical).toBe(false);
    });

    it('produces the same key for the same userId', async () => {
      const key1 = await deriveKey('user-same');
      const key2 = await deriveKey('user-same');

      // Encrypt with key1, decrypt with key2 should work
      const data = { value: 42 };
      const encrypted = await encrypt(key1, data);
      const decrypted = await decrypt(key2, encrypted);
      expect(decrypted).toEqual(data);
    });
  });

  describe('encrypt / decrypt roundtrip', () => {
    it('roundtrips a simple object', async () => {
      const key = await deriveKey('roundtrip-user');
      const original = { symbol: 'AAPL', pnl: 150.5, tags: ['momentum'] };
      const encrypted = await encrypt(key, original);
      const decrypted = await decrypt(key, encrypted);
      expect(decrypted).toEqual(original);
    });

    it('roundtrips an array', async () => {
      const key = await deriveKey('array-user');
      const original = [1, 'two', { three: 3 }];
      const encrypted = await encrypt(key, original);
      const decrypted = await decrypt(key, encrypted);
      expect(decrypted).toEqual(original);
    });

    it('roundtrips a string', async () => {
      const key = await deriveKey('string-user');
      const original = 'hello world';
      const encrypted = await encrypt(key, original);
      const decrypted = await decrypt(key, encrypted);
      expect(decrypted).toBe(original);
    });

    it('roundtrips null', async () => {
      const key = await deriveKey('null-user');
      const encrypted = await encrypt(key, null);
      const decrypted = await decrypt(key, encrypted);
      expect(decrypted).toBeNull();
    });

    it('produces ArrayBuffer output from encrypt', async () => {
      const key = await deriveKey('buffer-user');
      const encrypted = await encrypt(key, { x: 1 });
      expect(encrypted).toBeInstanceOf(ArrayBuffer);
      // Must be at least 12 bytes (IV) + some ciphertext
      expect(encrypted.byteLength).toBeGreaterThan(12);
    });

    it('fails to decrypt with wrong key', async () => {
      const key1 = await deriveKey('user-correct');
      const key2 = await deriveKey('user-wrong');
      const encrypted = await encrypt(key1, { secret: true });
      await expect(decrypt(key2, encrypted)).rejects.toThrow();
    });

    it('fails to decrypt corrupted data', async () => {
      const key = await deriveKey('corrupt-user');
      const encrypted = await encrypt(key, { data: 'ok' });
      const corrupted = new Uint8Array(encrypted);
      // Flip some bytes in the ciphertext portion
      corrupted[15] ^= 0xff;
      corrupted[20] ^= 0xff;
      await expect(decrypt(key, corrupted.buffer)).rejects.toThrow();
    });
  });
});
