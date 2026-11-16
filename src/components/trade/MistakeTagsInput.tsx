import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Plus, X } from 'lucide-react';

interface MistakeTagsInputProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  availableTags: string[];
  onAddNew: (tag: string) => void;
  /** What the items are called in the add row: "mistake" or "tag". */
  noun?: string;
  /** Longest value a new item may have. */
  maxLength?: number;
  className?: string;
}

export function MistakeTagsInput({
  selectedTags,
  onChange,
  availableTags,
  onAddNew,
  noun = 'mistake',
  maxLength,
  className,
}: MistakeTagsInputProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTag, setNewTag] = useState('');

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter((t) => t !== tag));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  const handleAddNew = () => {
    const tag = newTag.trim();
    if (!tag) return;
    if (!availableTags.includes(tag)) onAddNew(tag);
    if (!selectedTags.includes(tag)) onChange([...selectedTags, tag]);
    setNewTag('');
    setIsAdding(false);
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Available Tags */}
      <div className="flex flex-wrap gap-2">
        {(availableTags || []).map((tag) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              aria-pressed={isSelected}
              className={cn(
                'max-w-full rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors sm:px-3 sm:py-1.5 sm:text-sm [@media(pointer:coarse)]:min-h-11',
                // A chosen mistake reads as a fault, like a broken rule; a chosen tag is only a mark.
                isSelected
                  ? noun === 'mistake' ? 'border-destructive/40 bg-destructive/15 text-foreground' : 'border-primary/40 bg-primary/15 text-foreground'
                  : 'border-transparent bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
              )}
            >
              <span className="truncate">{tag}</span>
              {isSelected && <X className="ml-1 inline h-3 w-3 shrink-0 sm:ml-1.5" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      {/* Add New */}
      {isAdding ? (
        <div className="flex gap-1.5 sm:gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder={`New ${noun}`}
            aria-label={`New ${noun}`}
            maxLength={maxLength}
            className="h-8 text-xs sm:text-sm flex-1 min-w-0"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddNew();
              }
              if (e.key === 'Escape') {
                setIsAdding(false);
                setNewTag('');
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            onClick={handleAddNew}
            disabled={!newTag.trim()}
            className="h-8 px-3"
          >
            Add
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setIsAdding(false);
              setNewTag('');
            }}
            className="h-8 px-2"
            aria-label={`Cancel new ${noun}`}
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsAdding(true)}
          className="text-primary border-dashed"
        >
          <Plus className="w-4 h-4 mr-1" aria-hidden="true" />
          Add {noun}
        </Button>
      )}
    </div>
  );
}
