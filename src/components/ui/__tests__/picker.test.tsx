import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Picker } from '../picker';

const options = [{ value: 'Breakout' }, { value: 'Pullback' }, { value: 'Reversal', count: 3 }];

describe('Picker', () => {
  it('single: filters by typing, moves with arrows and picks with Enter', async () => {
    const onChange = vi.fn();
    render(<Picker mode="single" label="Strategy" options={options} value="" onChange={onChange} />);
    await userEvent.type(screen.getByRole('combobox', { name: 'Strategy' }), 're');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Breakout', 'Reversal3']);
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenCalledWith('Reversal');
  });

  it('single: marks the current value', () => {
    render(<Picker mode="single" label="Strategy" options={options} value="Pullback" onChange={vi.fn()} />);
    expect(screen.getByRole('option', { name: 'Pullback' })).toHaveAttribute('aria-selected', 'true');
  });

  it('multi: shows tri-state and toggles mixed to on', async () => {
    const onToggle = vi.fn();
    render(<Picker mode="multi" label="Mistakes" options={options} state={{ Breakout: 'on', Pullback: 'mixed' }} onToggle={onToggle} />);
    expect(screen.getByRole('option', { name: 'Pullback' })).toHaveAttribute('aria-checked', 'mixed');
    await userEvent.click(screen.getByRole('option', { name: 'Pullback' }));
    expect(onToggle).toHaveBeenCalledWith('Pullback', 'on');
    await userEvent.click(screen.getByRole('option', { name: 'Breakout' }));
    expect(onToggle).toHaveBeenCalledWith('Breakout', 'off');
  });

  it('offers to create text that matches nothing', async () => {
    const onCreate = vi.fn();
    const onChange = vi.fn();
    render(<Picker mode="single" label="Strategy" options={options} value="" onChange={onChange} onCreate={onCreate} />);
    await userEvent.type(screen.getByRole('combobox'), 'Gap fill');
    await userEvent.click(screen.getByRole('option', { name: /Create/ }));
    expect(onCreate).toHaveBeenCalledWith('Gap fill');
    expect(onChange).toHaveBeenCalledWith('Gap fill');
  });

  it('says when nothing matches', async () => {
    render(<Picker mode="single" label="Strategy" options={options} value="" onChange={vi.fn()} />);
    await userEvent.type(screen.getByRole('combobox'), 'zzz');
    expect(screen.getByText('Nothing matches.')).toBeInTheDocument();
  });
});
