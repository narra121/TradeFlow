import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';

interface SmartInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  onAddNew: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SmartInput({
  value,
  onChange,
  suggestions,
  onAddNew,
  placeholder,
  className,
}: SmartInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.trim()) {
      const filtered = suggestions.filter((s) =>
        s.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSuggestions(filtered);
    } else {
      setFilteredSuggestions(suggestions.slice(0, 5));
    }
  }, [value, suggestions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (suggestion: string) => {
    onChange(suggestion);
    setIsOpen(false);
  };

  const handleAddNew = () => {
    if (value.trim() && !suggestions.includes(value.trim())) {
      onAddNew(value.trim());
    }
    setIsOpen(false);
  };

  const showAddNew = value.trim() && !suggestions.some(
    (s) => s.toLowerCase() === value.toLowerCase()
  );

  return (
    <div ref={containerRef} className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className={cn('font-sans', className)}
      />
      
      {isOpen && (filteredSuggestions.length > 0 || showAddNew) && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
            {filteredSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => handleSelect(suggestion)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent/50 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
          
          {showAddNew && (
            <button
              type="button"
              onClick={handleAddNew}
              className="w-full px-3 py-2 text-left text-sm border-t border-border bg-secondary/50 hover:bg-secondary transition-colors flex items-center gap-2 text-primary"
            >
              <Plus className="w-4 h-4" />
              Create "{value.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
