import { cn } from '@/lib/utils';

interface TagFilterProps {
  tags: string[];
  activeTag: string | null;
  onTagChange: (tag: string | null) => void;
}

export function TagFilter({ tags, activeTag, onTagChange }: TagFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onTagChange(null)}
        className={cn(
          'text-sm font-medium px-3 py-1.5 rounded-full transition-colors',
          activeTag === null
            ? 'bg-primary text-primary-foreground'
            : 'bg-card border border-border/50 text-muted-foreground hover:text-foreground'
        )}
      >
        All
      </button>
      {tags.map((tag) => (
        <button
          key={tag}
          onClick={() => onTagChange(tag === activeTag ? null : tag)}
          className={cn(
            'text-sm font-medium px-3 py-1.5 rounded-full transition-colors capitalize',
            tag === activeTag
              ? 'bg-primary text-primary-foreground'
              : 'bg-card border border-border/50 text-muted-foreground hover:text-foreground'
          )}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
