const SALT = 'tradequt-cache-v1';
const IV_LENGTH = 12;

/**
 * Derive an AES-GCM CryptoKey from a userId.
 * SHA-256 hashes (userId + salt) and imports the digest as a raw AES-GCM key.
 */
export async function deriveKey(userId: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const material = encoder.encode(userId + SALT);
  const hash = await crypto.subtle.digest('SHA-256', material);
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

/**
 * Encrypt arbitrary data with AES-GCM.
 * Returns ArrayBuffer of (12-byte IV || ciphertext).
 */
export async function encrypt(
  key: CryptoKey,
  data: unknown
): Promise<ArrayBuffer> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );
  // Concatenate IV + ciphertext into a single buffer
  const result = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(ciphertext), iv.byteLength);
  return result.buffer;
}

/**
 * Decrypt an ArrayBuffer produced by encrypt().
 * Splits first 12 bytes as IV, decrypts the rest with AES-GCM.
 */
export async function decrypt(
  key: CryptoKey,
  buffer: ArrayBuffer
): Promise<unknown> {
  const data = new Uint8Array(buffer);
  const iv = data.slice(0, IV_LENGTH);
  const ciphertext = data.slice(IV_LENGTH);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  const text = new TextDecoder().decode(decrypted);
  return JSON.parse(text);
}
