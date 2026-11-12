import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTradeParam } from '@/hooks/useTradeParam';

interface ActivationPanelProps {
  /** No trading account yet: the one next step is creating one. */
  needsAccount?: boolean;
  title?: string;
}

/** Any data page with no trades in the whole scope: one sentence and the three ways in (A.11). */
export function ActivationPanel({ needsAccount, title = 'No trades yet.' }: ActivationPanelProps) {
  const trade = useTradeParam();
  return (
    <section aria-labelledby="activation-h" className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <h2 id="activation-h" className="mr-2 text-sm font-medium">{title}</h2>
      {needsAccount ? (
        <Button asChild size="sm">
          <Link to="/app/accounts?new=1">Create your first trading account</Link>
        </Button>
      ) : (
        <>
          <Button asChild variant="outline" size="sm">
            <Link to="/app/import">Import a broker file</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/app/import?source=screenshot">Upload a screenshot</Link>
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => trade.openNew()}>
            Add a trade manually
          </Button>
        </>
      )}
    </section>
  );
}
