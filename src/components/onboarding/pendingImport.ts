/** A file dropped on the first-run page, kept in memory until the import page takes it (one use). */
let pending: File | null = null;

export function setPendingImportFile(file: File | null): void {
  pending = file;
}

/** Returns the queued file once and clears it. */
export function takePendingImportFile(): File | null {
  const file = pending;
  pending = null;
  return file;
}
