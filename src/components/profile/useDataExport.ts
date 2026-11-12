import { useCallback, useEffect, useRef, useState } from 'react';
import { useExportMyDataMutation } from '@/store/api/profileApi';

export type ExportState =
  | { status: 'idle' }
  | { status: 'preparing' }
  | { status: 'ready'; url: string; fileName: string; size: string }
  | { status: 'error'; message: string };

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function exportFileName(exportedAt: string | undefined, now = new Date()): string {
  const date = exportedAt && /^\d{4}-\d{2}-\d{2}/.test(exportedAt) ? exportedAt.slice(0, 10) : now.toISOString().slice(0, 10);
  return `tradequt-export-${date}.json`;
}

/** Runs the account export, keeps the resulting file as an object URL, and lets the user cancel while it is prepared. */
export function useDataExport() {
  const [run] = useExportMyDataMutation();
  const [state, setState] = useState<ExportState>({ status: 'idle' });
  const pending = useRef<{ abort: () => void } | null>(null);
  const urlRef = useRef<string | null>(null);
  const cancelled = useRef(false);

  const release = () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  };

  useEffect(() => () => {
    cancelled.current = true;
    pending.current?.abort();
    release();
  }, []);

  const start = useCallback(async () => {
    release();
    cancelled.current = false;
    setState({ status: 'preparing' });
    const request = run();
    pending.current = request;
    try {
      const data = await request.unwrap();
      if (cancelled.current) return;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      urlRef.current = URL.createObjectURL(blob);
      setState({ status: 'ready', url: urlRef.current, fileName: exportFileName(data.exportedAt), size: formatFileSize(blob.size) });
    } catch {
      if (cancelled.current) return;
      setState({ status: 'error', message: "Couldn't prepare your export. Check your connection and try again." });
    } finally {
      pending.current = null;
    }
  }, [run]);

  const cancel = useCallback(() => {
    cancelled.current = true;
    pending.current?.abort();
    setState({ status: 'idle' });
  }, []);

  return { state, start, cancel };
}
