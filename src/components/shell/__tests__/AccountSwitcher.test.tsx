import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mobile = { value: true };
const account = { id: 'a1', name: 'E2E Forex USD Prop 100k', currency: 'USD', status: 'active', balance: 100000, broker: 'FTMO' };
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => mobile.value }));
vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: () => ({ accounts: [account], selectedAccountId: 'a1', selectedAccount: account, setSelectedAccountId: vi.fn() }),
}));

import { AccountSwitcher } from '../AccountSwitcher';

const setup = () =>
  render(
    <MemoryRouter>
      <AccountSwitcher />
    </MemoryRouter>,
  );

describe('AccountSwitcher', () => {
  it('on phones shows the account name with no icon, and keeps the full name and currency as name and title (R-001)', () => {
    mobile.value = true;
    setup();
    const btn = screen.getByRole('button', { name: 'Account: E2E Forex USD Prop 100k · USD' });
    expect(btn).toHaveTextContent('E2E Forex USD Prop 100k');
    expect(btn).toHaveAttribute('title', 'E2E Forex USD Prop 100k · USD');
    expect(btn.querySelectorAll('svg')).toHaveLength(1); // the chevron only
  });

  it('on larger screens keeps the wallet icon and the currency in the label', () => {
    mobile.value = false;
    setup();
    const btn = screen.getByRole('button', { name: 'Account: E2E Forex USD Prop 100k · USD' });
    expect(btn).toHaveTextContent('E2E Forex USD Prop 100k · USD');
    expect(btn.querySelectorAll('svg')).toHaveLength(2);
  });
});
