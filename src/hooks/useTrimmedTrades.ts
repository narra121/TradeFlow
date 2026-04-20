import { useState, useEffect, useRef } from 'react';
import type { Trade } from '@/types/trade';
import type { TrimmedTrade } from '@/types/insights';
import { trimTrades } from '@/lib/firebase/trades';
import { sha256Hex } from '@/lib/cache/hash';

export interface TrimmedTradesData {
  trimmed: TrimmedTrade[];
  hash: string;
}

export function useTrimmedTrades(trades: Trade[]): TrimmedTradesData | null {
  const [data, setData] = useState<TrimmedTradesData | null>(null);
  const prevKeyRef = useRef<string>('');

  useEffect(() => {
    const key = trades.map(t => t.id).join(',');
    if (key === prevKeyRef.current) return;
    prevKeyRef.current = key;

    if (trades.length === 0) {
      setData(null);
      return;
    }

    let cancelled = false;
    const trimmed = trimTrades(trades);
    sha256Hex(JSON.stringify(trimmed)).then(hash => {
      if (!cancelled) setData({ trimmed, hash });
    });

    return () => { cancelled = true; };
  }, [trades]);

  return data;
}
