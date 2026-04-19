/**
 * Browser SHA-256 utility using Web Crypto API.
 * Must match backend computeMonthHash algorithm exactly.
 */

/**
 * Compute SHA-256 hex digest of a string using Web Crypto API.
 */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Compute a month hash from an array of day hashes.
 * Must match backend computeMonthHash exactly:
 *   - Sort dates ascending
 *   - Join with date|tradeHash and ||
 *   - SHA-256 hex digest
 */
export async function computeLocalMonthHash(
  dayHashes: Array<{ date: string; tradeHash: string }>
): Promise<string> {
  const sorted = [...dayHashes].sort((a, b) => a.date.localeCompare(b.date));
  const input = sorted.map(d => `${d.date}|${d.tradeHash}`).join('||');
  return sha256Hex(input);
}
