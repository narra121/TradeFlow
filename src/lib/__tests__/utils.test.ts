import { describe, expect, it } from 'vitest';
import { cn } from '../utils';

describe('cn', () => {
  it('keeps a text colour next to the custom font sizes', () => {
    expect(cn('bg-primary text-primary-foreground', 'text-13')).toBe('bg-primary text-primary-foreground text-13');
    expect(cn('text-muted-foreground', 'text-2xs')).toBe('text-muted-foreground text-2xs');
  });

  it('still lets a later size or colour replace an earlier one', () => {
    expect(cn('text-sm', 'text-13')).toBe('text-13');
    expect(cn('text-13', 'text-xs')).toBe('text-xs');
    expect(cn('text-foreground', 'text-loss')).toBe('text-loss');
  });
});
