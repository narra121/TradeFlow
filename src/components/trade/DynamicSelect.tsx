import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { popupOption } from '@/components/ui/popup';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, Plus, X } from 'lucide-react';

interface DynamicSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  onAddNew?: (value: string) => void;
  onRemove?: (value: string) => void;
  /** Longest value a new option may have. */
  maxLength?: number;
  placeholder?: string;
  className?: string;
}

export function DynamicSelect({
  value,
  onChange,
  options,
  onAddNew,
  onRemove,
  maxLength,
  placeholder = 'Select...',
  className,
}: DynamicSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
  };

  const handleAddNew = () => {
    const value = newValue.trim();
    if (!value || !onAddNew) return;
    if (!options.includes(value)) onAddNew(value);
    onChange(value);
    setNewValue('');
    setIsAdding(false);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          aria-label={value ? `${placeholder}: ${value}` : placeholder}
          className={cn(
            'w-full justify-between font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          {value || placeholder}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[180px] p-1" align="start" aria-label={placeholder}>
        <div className="max-h-48 sm:max-h-60 overflow-y-auto">
          {(options || []).map((option) => (
            <div
              key={option}
              className="group flex items-center rounded-md hover:bg-secondary"
            >
              <button
                type="button"
                onClick={() => handleSelect(option)}
                className="flex min-h-8 flex-1 items-center justify-between rounded-md px-2 py-1.5 text-left text-13 -outline-offset-2 [@media(pointer:coarse)]:min-h-11"
              >
                {option}
                {value === option && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
              </button>
              {onRemove && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (value === option) onChange('');
                    onRemove(option);
                  }}
                  aria-label={`Remove ${option}`}
                  className="rounded-md px-2 py-2 text-muted-foreground opacity-0 -outline-offset-2 hover:text-error focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
        {onAddNew && (
          <div className="mt-1 border-t border-border pt-1">
            {isAdding ? (
              <div className="flex gap-2 p-1">
                <Input
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="Enter new value..."
                  maxLength={maxLength}
                  className="h-8 text-sm min-w-0 flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddNew();
                    }
                    if (e.key === 'Escape') {
                      setIsAdding(false);
                      setNewValue('');
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddNew}
                  disabled={!newValue.trim()}
                  className="h-8 px-3"
                >
                  Add
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className={cn(popupOption, 'gap-2 text-primary')}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add New
              </button>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
