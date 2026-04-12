import { useState, useCallback, useRef, useEffect } from 'react';

const DEBOUNCE_MS = 500;

export function useFormDraft(key: string) {
  const [draft, setDraft] = useState<Record<string, any> | null>(() => {
    try {
      const stored = sessionStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const save = useCallback((formState: Record<string, any>) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        sessionStorage.setItem(key, JSON.stringify(formState));
        setDraft(formState);
      } catch {
        // sessionStorage full or unavailable — ignore silently
      }
    }, DEBOUNCE_MS);
  }, [key]);

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    sessionStorage.removeItem(key);
    setDraft(null);
  }, [key]);

  return {
    draft,
    hasDraft: draft !== null,
    save,
    clear,
  };
}
