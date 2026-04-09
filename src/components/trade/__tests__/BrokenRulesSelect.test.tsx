import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrokenRulesSelect } from '../BrokenRulesSelect';
import type { TradingRule } from '@/lib/api/goalsRules';

const mockRules: TradingRule[] = [
  {
    userId: 'user-1',
    ruleId: 'rule-1',
    rule: 'Always use a stop loss',
    completed: false,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    userId: 'user-1',
    ruleId: 'rule-2',
    rule: 'Max 3 trades per day',
    completed: false,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    userId: 'user-1',
    ruleId: 'rule-3',
    rule: 'No trading during news',
    completed: false,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

describe('BrokenRulesSelect', () => {
  const defaultProps = {
    rules: mockRules,
    selectedRuleIds: [] as string[],
    onChange: vi.fn(),
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders all rules', () => {
    render(<BrokenRulesSelect {...defaultProps} />);

    expect(screen.getByText('Always use a stop loss')).toBeInTheDocument();
    expect(screen.getByText('Max 3 trades per day')).toBeInTheDocument();
    expect(screen.getByText('No trading during news')).toBeInTheDocument();
  });

  it('renders empty state when no rules exist', () => {
    render(<BrokenRulesSelect {...defaultProps} rules={[]} />);

    expect(
      screen.getByText('No trading rules defined. Add rules in Goals & Rules page.')
    ).toBeInTheDocument();
  });

  it('selects a rule when clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BrokenRulesSelect {...defaultProps} onChange={onChange} />);

    await user.click(screen.getByText('Always use a stop loss'));

    expect(onChange).toHaveBeenCalledWith(['rule-1']);
  });

  it('deselects a rule when a selected rule is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <BrokenRulesSelect
        {...defaultProps}
        selectedRuleIds={['rule-1', 'rule-2']}
        onChange={onChange}
      />
    );

    await user.click(screen.getByText('Always use a stop loss'));

    expect(onChange).toHaveBeenCalledWith(['rule-2']);
  });

  it('adds to existing selection when clicking an unselected rule', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <BrokenRulesSelect
        {...defaultProps}
        selectedRuleIds={['rule-1']}
        onChange={onChange}
      />
    );

    await user.click(screen.getByText('Max 3 trades per day'));

    expect(onChange).toHaveBeenCalledWith(['rule-1', 'rule-2']);
  });

  it('renders selected rules with different styling', () => {
    const { container } = render(
      <BrokenRulesSelect
        {...defaultProps}
        selectedRuleIds={['rule-1']}
      />
    );

    // The selected rule button should have the destructive styling
    const buttons = container.querySelectorAll('button');
    const selectedButton = Array.from(buttons).find((btn) =>
      btn.textContent?.includes('Always use a stop loss')
    );
    expect(selectedButton).toHaveClass('bg-destructive/10');

    // Unselected rules should not have destructive styling
    const unselectedButton = Array.from(buttons).find((btn) =>
      btn.textContent?.includes('Max 3 trades per day')
    );
    expect(unselectedButton).not.toHaveClass('bg-destructive/10');
  });
});
