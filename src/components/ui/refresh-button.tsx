import { RefreshCw } from 'lucide-react';
import { Button } from './button';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';
import { cn } from '@/lib/utils';

interface RefreshButtonProps {
  onRefresh: () => void;
  isFetching: boolean;
  className?: string;
}

export function RefreshButton({ onRefresh, isFetching, className }: RefreshButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={isFetching}
          className={cn("h-9 w-9", className)}
        >
          <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{isFetching ? 'Refreshing...' : 'Refresh data'}</p>
      </TooltipContent>
    </Tooltip>
  );
}
