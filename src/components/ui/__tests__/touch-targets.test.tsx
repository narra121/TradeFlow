import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { buttonVariants } from '../button';
import { Input } from '../input';
import { Select, SelectTrigger, SelectValue } from '../select';
import { SegmentedControl } from '../segmented-control';
import { Checkbox } from '../checkbox';
import { Switch } from '../switch';
import { DataTable } from '../data-table';

// jsdom does not evaluate media queries, so these pin the coarse-pointer classes the primitives carry
// (DESIGN-SHARED S4.2 buttons, S4.4 inputs, S10 targets: 44 px on touch; desktop sizes unchanged).
const COARSE_44 = /\[@media\(pointer:coarse\)\]:(min-)?h-11/;

describe('touch targets: every shared control is 44 px on a coarse pointer, desktop sizes unchanged', () => {
  it('Button: every size', () => {
    const sizes = { default: 'h-8', sm: 'h-7', lg: 'h-9', xl: 'h-10', icon: 'h-8', 'icon-sm': 'h-7' } as const;
    for (const [size, desktop] of Object.entries(sizes)) {
      const cls = buttonVariants({ size: size as keyof typeof sizes });
      expect(cls, size).toMatch(COARSE_44);
      expect(cls.split(' '), size).toContain(desktop);
    }
    expect(buttonVariants({ size: 'icon' })).toContain('[@media(pointer:coarse)]:w-11');
    expect(buttonVariants({ size: 'icon-sm' })).toContain('[@media(pointer:coarse)]:w-11');
  });

  it('Input and Select trigger', () => {
    render(
      <>
        <Input aria-label="Name" />
        <Select>
          <SelectTrigger aria-label="Period">
            <SelectValue placeholder="All time" />
          </SelectTrigger>
        </Select>
      </>,
    );
    expect(screen.getByLabelText('Name').className).toMatch(COARSE_44);
    expect(screen.getByLabelText('Name').className).toContain('h-9');
    expect(screen.getByRole('combobox', { name: 'Period' }).className).toMatch(COARSE_44);
  });

  it('SegmentedControl: both sizes', () => {
    for (const size of ['sm', 'md'] as const) {
      const { unmount } = render(<SegmentedControl label={size} size={size} value="a" onChange={() => undefined} options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]} />);
      for (const r of screen.getAllByRole('radio')) {
        expect(r.className, size).toMatch(COARSE_44);
        // A short label ("Year", "All") would otherwise give a segment narrower than 44 px.
        expect(r.className, size).toContain('[@media(pointer:coarse)]:min-w-11');
      }
      unmount();
    }
  });

  it('Checkbox and Switch keep their small visual and grow the hit area (a pseudo-element) to 44 px', () => {
    render(
      <>
        <Checkbox aria-label="Select row" />
        <Switch aria-label="Weekly report" />
      </>,
    );
    const box = screen.getByRole('checkbox', { name: 'Select row' });
    expect(box.className).toContain('h-4');
    // The pseudo-element is placed in the padding box: 14 px inside the 1 px border, + 2 × 15 = 44.
    expect(box.className).toContain('[@media(pointer:coarse)]:after:-inset-[15px]');
    const sw = screen.getByRole('switch', { name: 'Weekly report' });
    expect(sw.className).toContain('h-6');
    // 20 px inside the 2 px border, + 2 × 12 = 44.
    expect(sw.className).toContain('[@media(pointer:coarse)]:after:-inset-y-3');
  });

  it('DataTable: header, rows and header controls', () => {
    render(<DataTable caption="Rows" rows={[{ id: 'a' }]} columns={[{ id: 'n', header: 'Name', sortable: true, cell: (r) => r.id }]} getRowId={(r) => r.id} sort={{ id: 'n', dir: 'asc' }} onSort={() => undefined} />);
    const [head, row] = screen.getAllByRole('row');
    expect(head.className).toMatch(COARSE_44);
    expect(row.className).toMatch(COARSE_44);
    expect(screen.getByRole('button', { name: /Name/ }).className).toMatch(COARSE_44);
  });
});

describe('flat surfaces (DESIGN-SHARED S1.3, S3.2, S4.1)', () => {
  it('a primary button has no glow (R-032)', () => {
    expect(buttonVariants({ variant: 'default' })).not.toContain('glow-primary');
    const css = readFileSync(resolve(__dirname, '../../../index.css'), 'utf8');
    expect(css).not.toContain('.glow-primary');
  });

  it('the switch thumb has no drop shadow (R-037)', () => {
    render(<Switch aria-label="Carry" />);
    const thumb = screen.getByRole('switch', { name: 'Carry' }).querySelector('span');
    expect(thumb?.className).not.toMatch(/shadow/);
  });
});

describe('DateTimeField placeholder (R-020)', () => {
  it('reads as an example, not as a value that is already filled in', async () => {
    const { DateTimeField } = await import('../datetime-field');
    render(<DateTimeField value="" onChange={() => undefined} aria-label="Opened" />);
    expect(screen.getByLabelText('Opened')).toHaveAttribute('placeholder', 'e.g. 4 Nov 2026, 14:30');
  });
});
