import { test, expect } from '@playwright/test';

const DEV_URL = process.env.TEST_BASE_URL || 'https://dev.tradequt.com';
const TEST_EMAIL = process.env.TEST_EMAIL || '';
const TEST_PASSWORD = process.env.TEST_PASSWORD || '';

test.describe('Trade Cache Sync', () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Requires TEST_EMAIL and TEST_PASSWORD env vars');
  test.skip(true, 'Requires test account with trades and active subscription — run manually with seeded data');

  test.beforeEach(async ({ page }) => {
    await page.goto(`${DEV_URL}/login`, { waitUntil: 'networkidle' });
    await page.getByLabel('Email').fill(TEST_EMAIL);
    await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/app/**', { timeout: 30000 });
    await page.waitForLoadState('networkidle');
  });

  test('TC-901: updating a trade invalidates IndexedDB sync-key for that day', async ({ page }) => {
    // 1. Navigate to insights to populate IndexedDB cache via syncTrades
    await page.goto(`${DEV_URL}/app/insights`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);

    // 2. Read sync-keys count from IndexedDB
    const keysBefore = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        const token = localStorage.getItem('idToken');
        if (!token) { resolve(0); return; }
        const sub = JSON.parse(atob(token.split('.')[1])).sub;
        const req = indexedDB.open(`tradequt-cache-${sub}`);
        req.onerror = () => resolve(0);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('sync-keys')) { db.close(); resolve(0); return; }
          const tx = db.transaction('sync-keys', 'readonly');
          const store = tx.objectStore('sync-keys');
          const countReq = store.count();
          countReq.onsuccess = () => { db.close(); resolve(countReq.result); };
          countReq.onerror = () => { db.close(); resolve(0); };
        };
      });
    });

    // 3. Navigate to trade log and update a trade
    await page.goto(`${DEV_URL}/app/tradelog`, { waitUntil: 'networkidle' });
    await page.locator('tbody tr').first().waitFor({ state: 'visible', timeout: 10000 });

    // Click first trade to open detail
    await page.locator('tbody tr').first().click();
    await page.locator('[role="dialog"]').first().waitFor({ state: 'visible', timeout: 5000 });

    // Click Edit
    const editBtn = page.locator('[role="dialog"]').first().getByRole('button', { name: 'Edit' });
    await editBtn.click();
    await page.waitForTimeout(1000);

    // Modify notes field (least impactful)
    const textarea = page.locator('[role="dialog"] textarea').first();
    if (await textarea.isVisible({ timeout: 2000 })) {
      const original = await textarea.inputValue();
      await textarea.fill(`${original} [e2e-cache-test-${Date.now()}]`);
    }

    // Save
    const saveBtn = page.getByRole('button', { name: 'Save' })
      .or(page.locator('button[type="submit"]'))
      .first();
    await saveBtn.click();
    await page.waitForTimeout(2000);

    // 4. Check sync-keys after update — should have fewer entries
    const keysAfter = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        const token = localStorage.getItem('idToken');
        if (!token) { resolve(0); return; }
        const sub = JSON.parse(atob(token.split('.')[1])).sub;
        const req = indexedDB.open(`tradequt-cache-${sub}`);
        req.onerror = () => resolve(0);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('sync-keys')) { db.close(); resolve(0); return; }
          const tx = db.transaction('sync-keys', 'readonly');
          const store = tx.objectStore('sync-keys');
          const countReq = store.count();
          countReq.onsuccess = () => { db.close(); resolve(countReq.result); };
          countReq.onerror = () => { db.close(); resolve(0); };
        };
      });
    });

    // If cache was populated, sync-keys should have been invalidated
    if (keysBefore > 0) {
      expect(keysAfter).toBeLessThan(keysBefore);
    }
  });

  test('TC-902: POST /trades/sync is called after sync-key invalidation', async ({ page }) => {
    // 1. Clear all sync-keys to simulate invalidation
    await page.goto(`${DEV_URL}/app/tradelog`, { waitUntil: 'networkidle' });
    await page.locator('tbody tr').first().waitFor({ state: 'visible', timeout: 10000 });

    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        const token = localStorage.getItem('idToken');
        if (!token) { resolve(); return; }
        const sub = JSON.parse(atob(token.split('.')[1])).sub;
        const req = indexedDB.open(`tradequt-cache-${sub}`);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('sync-keys')) { db.close(); resolve(); return; }
          const tx = db.transaction('sync-keys', 'readwrite');
          tx.objectStore('sync-keys').clear();
          tx.oncomplete = () => { db.close(); resolve(); };
        };
        req.onerror = () => resolve();
      });
    });

    // 2. Listen for POST /trades/sync requests
    const syncRequests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/trades/sync') && req.method() === 'POST') {
        syncRequests.push(req.url());
      }
    });

    // 3. Navigate to insights (triggers syncTrades with empty hashes)
    await page.goto(`${DEV_URL}/app/insights`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    // 4. Verify POST /trades/sync was called
    expect(syncRequests.length).toBeGreaterThan(0);
  });
});
