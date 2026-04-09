import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn (className utility)', () => {
  describe('basic merging', () => {
    it('merges multiple class strings', () => {
      const result = cn('foo', 'bar');
      expect(result).toBe('foo bar');
    });

    it('returns empty string for no arguments', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('handles a single class string', () => {
      const result = cn('hello');
      expect(result).toBe('hello');
    });

    it('handles multiple space-separated classes', () => {
      const result = cn('a b', 'c d');
      expect(result).toBe('a b c d');
    });
  });

  describe('handling falsy inputs', () => {
    it('handles undefined inputs', () => {
      const result = cn('foo', undefined, 'bar');
      expect(result).toBe('foo bar');
    });

    it('handles null inputs', () => {
      const result = cn('foo', null, 'bar');
      expect(result).toBe('foo bar');
    });

    it('handles false inputs', () => {
      const result = cn('foo', false, 'bar');
      expect(result).toBe('foo bar');
    });

    it('handles empty string inputs', () => {
      const result = cn('foo', '', 'bar');
      expect(result).toBe('foo bar');
    });

    it('handles 0 as input', () => {
      const result = cn('foo', 0, 'bar');
      expect(result).toBe('foo bar');
    });

    it('returns empty string when all inputs are falsy', () => {
      const result = cn(undefined, null, false, '');
      expect(result).toBe('');
    });
  });

  describe('conditional classes', () => {
    it('handles conditional classes via logical AND', () => {
      const isActive = true;
      const result = cn('base', isActive && 'active');
      expect(result).toBe('base active');
    });

    it('omits conditional classes when false', () => {
      const isActive = false;
      const result = cn('base', isActive && 'active');
      expect(result).toBe('base');
    });

    it('handles object syntax for conditional classes', () => {
      const result = cn('base', { active: true, disabled: false });
      expect(result).toBe('base active');
    });

    it('handles all false conditions in object syntax', () => {
      const result = cn({ active: false, disabled: false });
      expect(result).toBe('');
    });

    it('handles all true conditions in object syntax', () => {
      const result = cn({ active: true, disabled: true });
      expect(result).toBe('active disabled');
    });
  });

  describe('array inputs', () => {
    it('handles array of classes', () => {
      const result = cn(['foo', 'bar']);
      expect(result).toBe('foo bar');
    });

    it('handles nested arrays', () => {
      const result = cn(['foo', ['bar', 'baz']]);
      expect(result).toBe('foo bar baz');
    });

    it('handles arrays with falsy values', () => {
      const result = cn(['foo', null, 'bar', undefined]);
      expect(result).toBe('foo bar');
    });
  });

  describe('Tailwind conflict resolution', () => {
    it('resolves padding conflicts (last wins)', () => {
      const result = cn('p-4', 'p-2');
      expect(result).toBe('p-2');
    });

    it('resolves margin conflicts', () => {
      const result = cn('m-4', 'm-8');
      expect(result).toBe('m-8');
    });

    it('resolves text color conflicts', () => {
      const result = cn('text-red-500', 'text-blue-500');
      expect(result).toBe('text-blue-500');
    });

    it('resolves background color conflicts', () => {
      const result = cn('bg-red-500', 'bg-blue-500');
      expect(result).toBe('bg-blue-500');
    });

    it('resolves font size conflicts', () => {
      const result = cn('text-sm', 'text-lg');
      expect(result).toBe('text-lg');
    });

    it('resolves display conflicts', () => {
      const result = cn('block', 'flex');
      expect(result).toBe('flex');
    });

    it('preserves non-conflicting classes', () => {
      const result = cn('p-4', 'text-red-500', 'p-2');
      expect(result).toBe('text-red-500 p-2');
    });

    it('resolves rounded conflicts', () => {
      const result = cn('rounded-sm', 'rounded-lg');
      expect(result).toBe('rounded-lg');
    });

    it('handles complex real-world usage', () => {
      const result = cn(
        'flex items-center justify-center',
        'bg-white text-black',
        'bg-gray-100',
      );
      expect(result).toContain('flex');
      expect(result).toContain('items-center');
      expect(result).toContain('justify-center');
      expect(result).toContain('bg-gray-100');
      expect(result).not.toContain('bg-white');
    });
  });

  describe('mixed input types', () => {
    it('handles mix of strings, objects, and arrays', () => {
      const result = cn('base', { active: true }, ['extra']);
      expect(result).toBe('base active extra');
    });

    it('handles complex conditional patterns used in component libraries', () => {
      const variant = 'primary';
      const size = 'lg';
      const result = cn(
        'btn',
        variant === 'primary' && 'bg-blue-500 text-white',
        variant === 'secondary' && 'bg-gray-500 text-white',
        size === 'lg' && 'px-6 py-3',
        size === 'sm' && 'px-2 py-1',
      );
      expect(result).toBe('btn bg-blue-500 text-white px-6 py-3');
    });
  });
});
