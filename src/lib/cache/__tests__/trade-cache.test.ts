import { describe, it, expect } from 'vitest';
import 'fake-indexeddb/auto';
import { clearDatabase } from '../trade-cache';

const open = (name: string) =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('trades');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const names = async () => (await indexedDB.databases()).map((d) => d.name);

describe('cache/trade-cache clearDatabase', () => {
  it('deletes the old per-user trade cache database and no other', async () => {
    (await open('tradequt-cache-user-1')).close();
    (await open('tradequt-cache-user-2')).close();

    await clearDatabase('user-1');

    expect(await names()).toEqual(['tradequt-cache-user-2']);
    await clearDatabase('user-2');
  });

  it('resolves when the user has no database', async () => {
    await expect(clearDatabase('nobody')).resolves.toBeUndefined();
  });
});
