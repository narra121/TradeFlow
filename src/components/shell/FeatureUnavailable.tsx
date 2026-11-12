import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

/** Screens whose backend is not deployed yet render this instead of calling the API (and logging 404s). */
export function FeatureUnavailable({ title, feature }: { title: string; feature: string }) {
  return (
    <div className="space-y-4" data-feature={feature}>
      <h2 className="text-xl font-semibold">{title}</h2>
      <EmptyState
        title="Not available yet"
        description="This part of TradeQut is being rolled out. Your journal, trades and analytics are not affected."
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/app/dashboard">Back to the dashboard</Link>
          </Button>
        }
      />
    </div>
  );
}
