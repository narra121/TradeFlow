import { cn } from '@/lib/utils';
import { formatMoney, formatR, signOf } from '@/lib/format';

const TONE = { positive: 'text-profit', negative: 'text-loss', zero: 'text-foreground-soft' } as const;

interface MoneyProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number | null | undefined;
  currency?: string;
  sign?: boolean;
  decimals?: number;
  neutral?: boolean;
}

export function Money({ value, currency, sign = true, decimals, neutral, className, ...rest }: MoneyProps) {
  const tone = neutral ? '' : TONE[signOf(value)];
  return (
    <span className={cn('whitespace-nowrap font-mono tabular-nums', tone, className)} {...rest}>
      {formatMoney(value, currency, { sign, decimals })}
    </span>
  );
}

export function RMultiple({ value, className }: { value: number | null | undefined; className?: string }) {
  return <span className={cn('whitespace-nowrap font-mono tabular-nums', TONE[signOf(value)], className)}>{formatR(value)}</span>;
}
