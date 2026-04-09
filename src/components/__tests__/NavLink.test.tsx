import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { NavLink } from '../NavLink';

describe('NavLink', () => {
  it('renders link text', () => {
    renderWithProviders(<NavLink to="/dashboard">Dashboard</NavLink>);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders as a link element', () => {
    renderWithProviders(<NavLink to="/dashboard">Dashboard</NavLink>);
    const link = screen.getByRole('link', { name: 'Dashboard' });
    expect(link).toBeInTheDocument();
  });

  it('has the correct href', () => {
    renderWithProviders(<NavLink to="/trades">Trades</NavLink>);
    const link = screen.getByRole('link', { name: 'Trades' });
    expect(link).toHaveAttribute('href', '/trades');
  });

  it('applies base className', () => {
    renderWithProviders(
      <NavLink to="/dashboard" className="nav-item">
        Dashboard
      </NavLink>
    );
    const link = screen.getByRole('link', { name: 'Dashboard' });
    expect(link).toHaveClass('nav-item');
  });

  it('applies activeClassName when the link is active', () => {
    // Render with route matching the NavLink "to" prop
    renderWithProviders(
      <NavLink to="/dashboard" className="nav-item" activeClassName="active">
        Dashboard
      </NavLink>,
      { route: '/dashboard' }
    );
    const link = screen.getByRole('link', { name: 'Dashboard' });
    expect(link).toHaveClass('active');
    expect(link).toHaveClass('nav-item');
  });

  it('does not apply activeClassName when the link is not active', () => {
    renderWithProviders(
      <NavLink to="/dashboard" className="nav-item" activeClassName="active">
        Dashboard
      </NavLink>,
      { route: '/other-page' }
    );
    const link = screen.getByRole('link', { name: 'Dashboard' });
    expect(link).toHaveClass('nav-item');
    expect(link).not.toHaveClass('active');
  });

  it('renders with children that include elements', () => {
    renderWithProviders(
      <NavLink to="/settings">
        <span data-testid="icon">*</span>
        <span>Settings</span>
      </NavLink>
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });
});
