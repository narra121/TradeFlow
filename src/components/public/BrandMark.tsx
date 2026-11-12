import { LineChart } from 'lucide-react';

/** The product mark: the same flat line-chart glyph and wordmark the app sidebar shows. No tile, no gradient. */
export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold ${className}`}>
      <LineChart className="h-5 w-5 text-primary" aria-hidden="true" />
      TradeQut
    </span>
  );
}
