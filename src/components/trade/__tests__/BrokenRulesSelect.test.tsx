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
      screen.getByText('No trading rules defined yet')
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

describe('BrokenRulesSelect – additional coverage', () => {
  const defaultProps = {
    rules: mockRules,
    selectedRuleIds: [] as string[],
    onChange: vi.fn(),
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders with empty rules list showing empty state message', () => {
    render(<BrokenRulesSelect rules={[]} selectedRuleIds={[]} onChange={vi.fn()} />);

    expect(
      screen.getByText('No trading rules defined yet')
    ).toBeInTheDocument();
  });

  it('selects multiple rules in sequence', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    // Render with rule-1 already selected, then click rule-2
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

  it('deselects a rule when a selected rule is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <BrokenRulesSelect
        {...defaultProps}
        selectedRuleIds={['rule-1', 'rule-2', 'rule-3']}
        onChange={onChange}
      />
    );

    await user.click(screen.getByText('Max 3 trades per day'));

    expect(onChange).toHaveBeenCalledWith(['rule-1', 'rule-3']);
  });

  it('shows all rules as options', () => {
    render(<BrokenRulesSelect {...defaultProps} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(4);
    expect(screen.getByText('Always use a stop loss')).toBeInTheDocument();
    expect(screen.getByText('Max 3 trades per day')).toBeInTheDocument();
    expect(screen.getByText('No trading during news')).toBeInTheDocument();
  });

  it('handles undefined/empty selectedRuleIds gracefully', () => {
    render(
      <BrokenRulesSelect
        rules={mockRules}
        selectedRuleIds={[]}
        onChange={vi.fn()}
      />
    );

    // All rules should render without destructive styling
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => {
      expect(btn).not.toHaveClass('bg-destructive/10');
    });
  });

  it('renders each rule as a button element for accessibility', () => {
    render(<BrokenRulesSelect {...defaultProps} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(4);

    // Each button should have type="button"
    buttons.forEach((btn) => {
      expect(btn).toHaveAttribute('type', 'button');
    });
  });
});

describe('BrokenRulesSelect – empty state details', () => {
  it('shows description text in empty state', () => {
    render(
      <BrokenRulesSelect rules={[]} selectedRuleIds={[]} onChange={vi.fn()} />
    );

    expect(
      screen.getByText('Create rules to track which ones you break per trade')
    ).toBeInTheDocument();
  });

  it('shows button to open Goals & Rules in new tab', () => {
    render(
      <BrokenRulesSelect rules={[]} selectedRuleIds={[]} onChange={vi.fn()} />
    );

    const btn = screen.getByRole('button', { name: /Go to Goals & Rules/ });
    expect(btn).toBeInTheDocument();
  });

  it('empty state does not show when rules exist', () => {
    render(
      <BrokenRulesSelect
        rules={mockRules}
        selectedRuleIds={[]}
        onChange={vi.fn()}
      />
    );

    expect(
      screen.queryByText('No trading rules defined yet')
    ).not.toBeInTheDocument();
  });

  it('shows "Edit rules" button when rules exist', () => {
    render(
      <BrokenRulesSelect
        rules={mockRules}
        selectedRuleIds={[]}
        onChange={vi.fn()}
      />
    );

    const btn = screen.getByRole('button', { name: /Edit rules in Goals & Rules/ });
    expect(btn).toBeInTheDocument();
  });

  it('opens Goals & Rules in new tab when "Edit rules" clicked', async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(
      <BrokenRulesSelect
        rules={mockRules}
        selectedRuleIds={[]}
        onChange={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /Edit rules in Goals & Rules/ }));
    expect(openSpy).toHaveBeenCalledWith('/app/goals', '_blank');

    openSpy.mockRestore();
  });
});
