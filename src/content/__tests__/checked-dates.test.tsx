import { describe, expect, it } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { checkedOn, COMPETITORS } from '@/content/alternatives';
import AlternativesIndexPage from '@/pages/seo/AlternativesIndexPage';
import MyfxbookAlternativePage from '@/pages/seo/MyfxbookAlternativePage';

describe('vendor check dates in running text (D.3: day first)', () => {
  it('formats a calendar day without a time zone shift', () => {
    expect(checkedOn('2026-11-15')).toBe('15 Nov 2026');
    expect(checkedOn('2026-01-02')).toBe('2 Jan 2026');
  });

  it('the comparison cards and the comparison page say "Checked 15 Nov 2026", not 2026-11-15', () => {
    const { container, unmount } = renderWithProviders(<AlternativesIndexPage />);
    expect(container.textContent).not.toMatch(/Checked 20\d\d-\d\d-\d\d/);
    expect(container.textContent).toContain(`Checked ${checkedOn(COMPETITORS[0].checked)}.`);
    unmount();
    const page = renderWithProviders(<MyfxbookAlternativePage />);
    expect(page.container.textContent).not.toMatch(/checked on 20\d\d-\d\d-\d\d/i);
    expect(screen.getByText(/Prices were checked on \d{1,2} [A-Z][a-z]{2} 20\d\d\./)).toBeInTheDocument();
  });
});
