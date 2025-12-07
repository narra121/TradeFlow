import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, Plus } from 'lucide-react';

interface DynamicSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  onAddNew?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function DynamicSelect({
  value,
  onChange,
  options,
  onAddNew,
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
    if (onAddNew && newValue.trim() && !options.includes(newValue.trim())) {
      onAddNew(newValue.trim());
      onChange(newValue.trim());
      setNewValue('');
      setIsAdding(false);
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
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
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover border-border" align="start">
        <div className="max-h-60 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => handleSelect(option)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent/50 transition-colors flex items-center justify-between"
            >
              {option}
              {value === option && <Check className="w-4 h-4 text-primary" />}
            </button>
          ))}
        </div>
        {onAddNew && (
          <div className="border-t border-border">
            {isAdding ? (
              <div className="p-2 flex gap-2">
                <Input
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="Enter new value..."
                  className="h-8 text-sm"
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
                className="w-full px-3 py-2 text-left text-sm bg-secondary/50 hover:bg-secondary transition-colors flex items-center gap-2 text-primary"
              >
                <Plus className="w-4 h-4" />
                Add New
              </button>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
