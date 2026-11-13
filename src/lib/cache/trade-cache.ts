function dbName(userId: string): string {
  return `tradequt-cache-${userId}`;
}

/** Removes the per-user IndexedDB that earlier versions filled with a trade cache; logout still calls it for those users. */
export function clearDatabase(userId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(dbName(userId));
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
