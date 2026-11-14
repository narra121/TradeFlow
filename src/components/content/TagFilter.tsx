import { useId } from 'react';

interface TagFilterProps {
  tags: string[];
  activeTag: string | null;
  onTagChange: (tag: string | null) => void;
  /** Number of items per tag, shown in the option label. */
  counts?: Record<string, number>;
}

const label = (tag: string) => tag.charAt(0).toUpperCase() + tag.slice(1);

/** One labelled select instead of a wall of buttons: it scales to any number of topics and works with a keyboard and a screen reader. */
export function TagFilter({ tags, activeTag, onTagChange, counts }: TagFilterProps) {
  const id = useId();
  return (
    <div className="flex items-center gap-3">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        Topic
      </label>
      <select
        id={id}
        value={activeTag ?? ''}
        onChange={(e) => onTagChange(e.target.value || null)}
        className="h-10 max-md:h-11 min-w-48 rounded-md border border-input bg-card px-3 text-sm text-foreground"
      >
        <option value="">All topics</option>
        {tags.map((tag) => (
          <option key={tag} value={tag}>
            {label(tag)}
            {counts?.[tag] ? ` (${counts[tag]})` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
