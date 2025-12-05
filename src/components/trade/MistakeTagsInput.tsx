import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Plus, X } from 'lucide-react';

interface MistakeTagsInputProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  availableTags: string[];
  onAddNew: (tag: string) => void;
  className?: string;
}

export function MistakeTagsInput({
  selectedTags,
  onChange,
  availableTags,
  onAddNew,
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
    if (newTag.trim() && !availableTags.includes(newTag.trim())) {
      onAddNew(newTag.trim());
      onChange([...selectedTags, newTag.trim()]);
      setNewTag('');
      setIsAdding(false);
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Available Tags */}
      <div className="flex flex-wrap gap-2">
        {availableTags.map((tag) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                isSelected
                  ? 'bg-destructive text-destructive-foreground shadow-lg shadow-destructive/25'
                  : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
              )}
            >
              {tag}
              {isSelected && <X className="w-3 h-3 ml-1.5 inline" />}
            </button>
          );
        })}
      </div>

      {/* Add New */}
      {isAdding ? (
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Enter new mistake..."
            className="h-8 text-sm flex-1"
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
          className="text-primary border-dashed"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add New Mistake
        </Button>
      )}
    </div>
  );
}
