import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Plus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface DropdownOptionsManagerProps {
  title: string;
  description: string;
  options: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  isLoading?: boolean;
  pendingValue?: string;
  pendingAction?: 'add' | 'remove';
  placeholder?: string;
}

export function DropdownOptionsManager({
  title,
  description,
  options,
  onAdd,
  onRemove,
  isLoading = false,
  pendingValue,
  pendingAction,
  placeholder = 'Add new option...',
}: DropdownOptionsManagerProps) {
  const [newValue, setNewValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const isPendingAdd = pendingAction === 'add';
  const isPendingRemove = pendingAction === 'remove';

  const handleAdd = () => {
    const trimmed = newValue.trim();
    if (trimmed && !(options || []).includes(trimmed)) {
      onAdd(trimmed);
      setNewValue('');
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
    if (e.key === 'Escape') {
      setIsAdding(false);
      setNewValue('');
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-foreground text-sm sm:text-base">{title}</h3>
          {(isPendingAdd || isPendingRemove) && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
          )}
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(options || []).map((option) => (
          <Badge
            key={option}
            variant="secondary"
            className="pl-2.5 sm:pl-3 pr-1 py-1.5 text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5 group hover:bg-secondary/80 max-w-full"
          >
            <span className="flex items-center gap-1.5 truncate">
              {option}
              {isPendingRemove && pendingValue === option && (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground shrink-0" />
              )}
            </span>
            {isPendingRemove && pendingValue === option ? (
              <span className="ml-1 p-0.5 inline-flex" aria-hidden="true" />
            ) : (
              <button
                type="button"
                onClick={() => onRemove(option)}
                className="ml-1 p-1 sm:p-0.5 rounded-full hover:bg-destructive/20 transition-colors min-w-[28px] min-h-[28px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                disabled={isLoading}
              >
                <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
              </button>
            )}
          </Badge>
        ))}

        {isAdding ? (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder={placeholder}
              className="h-10 sm:h-8 flex-1 sm:flex-none sm:w-40 text-sm"
              autoFocus
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <Button
              type="button"
              size="sm"
              onClick={handleAdd}
              disabled={!newValue.trim() || isLoading}
              className="h-10 sm:h-8 px-3 min-w-[44px]"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAdding(false);
                setNewValue('');
              }}
              disabled={isLoading}
              className="h-10 sm:h-8 px-2 min-w-[44px]"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="h-10 sm:h-8 gap-1.5 min-w-[44px]"
            disabled={isLoading}
          >
            {isPendingAdd ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            {isPendingAdd ? 'Saving' : 'Add'}
          </Button>
        )}
      </div>
    </div>
  );
}
