import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const scope = vi.fn();
vi.mock('@/hooks/useScopeTrades', () => ({ useScopeTrades: (...a: unknown[]) => scope(...a) }));

import { MonthHeat } from '../MonthHeat';

const renderHeat = () => render(<MemoryRouter><MonthHeat accounts={new Map()} anchor={new Date('2026-11-12T00:00:00')} /></MemoryRouter>);

beforeEach(() => scope.mockReset());

describe('MonthHeat', () => {
  it('adds the API message of a failed load', () => {
    scope.mockReturnValue({ trades: [], isLoading: false, isError: true, error: { status: 500, data: { message: 'Trades are being moved.' } } });
    renderHeat();
    expect(screen.getByText(/Could not load this month\. Trades are being moved\./)).toBeInTheDocument();
  });

  it('says to check the connection only when nothing answered', () => {
    scope.mockReturnValue({ trades: [], isLoading: false, isError: true, error: { status: 'FETCH_ERROR' } });
    renderHeat();
    expect(screen.getByText(/Check your internet connection/)).toBeInTheDocument();
  });
});
