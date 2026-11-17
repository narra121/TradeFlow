import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DropZone } from '../DropZone';

describe('DropZone', () => {
  it('tells a touch screen to choose files, not to drop or press Ctrl+V (L22-034)', () => {
    render(<DropZone onFiles={vi.fn()} />);
    expect(screen.getByText(/Drop a broker export or screenshots here, paste \(Ctrl\+V\), or/).className).toMatch(/\[@media\(pointer:coarse\)\]:hidden/);
    const touch = screen.getByText('Add a broker export or screenshots:');
    expect(touch.className).toMatch(/\bhidden\b/);
    expect(touch.className).toMatch(/\[@media\(pointer:coarse\)\]:inline/);
  });
});
