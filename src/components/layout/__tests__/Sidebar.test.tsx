import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Sidebar } from '../Sidebar';

vi.mock('@/components/shell/UserMenu', () => ({ UserMenu: () => <button type="button">Account menu</button> }));

function setup(props: Partial<React.ComponentProps<typeof Sidebar>> = {}, path = '/app/tradelog') {
  const onCollapsedChange = vi.fn();
  render(
    <Provider store={store}>
      <TooltipProvider>
        <MemoryRouter initialEntries={[path]}>
          <Sidebar collapsed={false} onCollapsedChange={onCollapsedChange} {...props} />
        </MemoryRouter>
      </TooltipProvider>
    </Provider>,
  );
  return { onCollapsedChange };
}

describe('Sidebar', () => {
  it('is a labelled main navigation with the three groups', () => {
    setup();
    const nav = screen.getByRole('navigation', { name: 'Main' });
    for (const g of ['Journal', 'Review', 'Data']) expect(within(nav).getByText(g)).toBeInTheDocument();
  });

  it('lists every destination including the new ones', () => {
    setup();
    for (const label of ['Dashboard', 'Trades', 'Calendar', 'Analytics', 'Goals & rules', 'Insights', 'Accounts', 'Import', 'Settings']) {
      expect(screen.getByRole('link', { name: new RegExp(label) })).toBeInTheDocument();
    }
  });

  it('marks the current page and tags AI items with text', () => {
    setup();
    expect(screen.getByRole('link', { name: 'Trades' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current');
    expect(within(screen.getByRole('link', { name: /Insights/ })).getByText('AI')).toBeInTheDocument();
  });

  it('collapses to an icon rail that keeps accessible names', () => {
    setup({ collapsed: true });
    expect(screen.queryByText('Journal')).toBeNull();
    expect(screen.getByRole('link', { name: 'Calendar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument();
  });

  it('toggles collapse', async () => {
    const { onCollapsedChange } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(onCollapsedChange).toHaveBeenCalledWith(true);
  });

  it('keeps Chat out of the sidebar (it is a tab of Insights) and puts Settings in the footer', () => {
    setup();
    expect(screen.queryByRole('link', { name: /^Chat/ })).toBeNull();
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/app/settings');
  });

  it('shows the import-in-review dot with a text alternative', () => {
    setup({ importInReview: true });
    expect(screen.getByText('Import in review')).toBeInTheDocument();
  });

  it('renders the plan card slot only when expanded', () => {
    setup({ planCard: <div>Pro trial · 9 days left</div> });
    expect(screen.getByText('Pro trial · 9 days left')).toBeInTheDocument();
  });
});
