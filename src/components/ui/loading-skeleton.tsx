import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Trade table skeleton
export function TradeTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50">
              <th className="px-5 py-4 text-left"><Skeleton className="h-4 w-16" /></th>
              <th className="px-5 py-4 text-left"><Skeleton className="h-4 w-16" /></th>
              <th className="px-5 py-4 text-left"><Skeleton className="h-4 w-12" /></th>
              <th className="px-5 py-4 text-left"><Skeleton className="h-4 w-12" /></th>
              <th className="px-5 py-4 text-left"><Skeleton className="h-4 w-10" /></th>
              <th className="px-5 py-4 text-left"><Skeleton className="h-4 w-10" /></th>
              <th className="px-5 py-4 text-left"><Skeleton className="h-4 w-16" /></th>
              <th className="px-5 py-4 text-right"><Skeleton className="h-4 w-14 ml-auto" /></th>
              <th className="px-5 py-4 text-right"><Skeleton className="h-4 w-8 ml-auto" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i} className="animate-pulse">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded-lg" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </td>
                <td className="px-5 py-4"><Skeleton className="h-6 w-14 rounded-full" /></td>
                <td className="px-5 py-4">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </td>
                <td className="px-5 py-4"><Skeleton className="h-4 w-10" /></td>
                <td className="px-5 py-4"><Skeleton className="h-4 w-10" /></td>
                <td className="px-5 py-4"><Skeleton className="h-6 w-14 rounded-full" /></td>
                <td className="px-5 py-4 text-right">
                  <div className="space-y-1 flex flex-col items-end">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1 justify-end">
                    <Skeleton className="w-8 h-8 rounded" />
                    <Skeleton className="w-8 h-8 rounded" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Stats card skeleton
export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("glass-card p-5 animate-pulse", className)}>
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-8 w-24" />
    </div>
  );
}

// Dashboard stats grid skeleton
export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Chart skeleton
export function ChartSkeleton({ className, height = "h-[280px]" }: { className?: string; height?: string }) {
  return (
    <div className={cn("glass-card p-5 animate-pulse", className)}>
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className={cn("flex items-end justify-around gap-2", height)}>
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton 
            key={i} 
            className="flex-1 rounded-t" 
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// Win rate ring skeleton
export function WinRateRingSkeleton() {
  return (
    <div className="glass-card p-5 animate-pulse">
      <Skeleton className="h-5 w-24 mb-6" />
      <div className="flex items-center justify-center">
        <Skeleton className="w-40 h-40 rounded-full" />
      </div>
      <div className="flex justify-around mt-6">
        <div className="text-center">
          <Skeleton className="h-4 w-10 mx-auto mb-1" />
          <Skeleton className="h-3 w-8 mx-auto" />
        </div>
        <div className="text-center">
          <Skeleton className="h-4 w-10 mx-auto mb-1" />
          <Skeleton className="h-3 w-8 mx-auto" />
        </div>
      </div>
    </div>
  );
}

// Recent trades list skeleton
export function RecentTradesListSkeleton() {
  return (
    <div className="glass-card p-5 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <div>
                <Skeleton className="h-4 w-16 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-4 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Quick stats skeleton
export function QuickStatsSkeleton() {
  return (
    <div className="glass-card p-5 animate-pulse">
      <Skeleton className="h-5 w-24 mb-4" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Goals card skeleton
export function GoalCardSkeleton() {
  return (
    <div className="glass-card p-5 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-11 h-11 rounded-xl" />
          <div>
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="w-7 h-7 rounded" />
      </div>
      <div className="space-y-3">
        <div className="flex items-end justify-between">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-12" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
    </div>
  );
}

// Rules list skeleton
export function RulesListSkeleton() {
  return (
    <div className="glass-card p-6 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-6 w-32" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-secondary/30">
            <Skeleton className="w-6 h-6 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="w-8 h-8 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Accounts card skeleton
export function AccountCardSkeleton() {
  return (
    <div className="glass-card p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div>
            <Skeleton className="h-5 w-28 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="space-y-3">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
}

// Analytics metrics skeleton
export function MetricsGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="glass-card p-4 animate-pulse">
          <Skeleton className="h-4 w-16 mb-2" />
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  );
}

// Calendar skeleton
export function CalendarSkeleton() {
  return (
    <div className="glass-card p-5 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>
      <div className="grid grid-cols-8 gap-2">
        {/* Header row */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Week'].map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-4 w-full" />
        ))}
        {/* Calendar days - 5 weeks */}
        {Array.from({ length: 40 }).map((_, i) => (
          <Skeleton key={`day-${i}`} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
