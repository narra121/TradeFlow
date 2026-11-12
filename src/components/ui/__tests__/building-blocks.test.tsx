import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Field } from '../field';
import { SegmentedControl } from '../segmented-control';
import { ErrorState } from '../error-state';
import { Money, RMultiple } from '../money';
import { DirectionChip, OutcomeChip } from '../chips';
import { Panel } from '../panel';

describe('Field', () => {
  it('ties label, hint and error to the control', () => {
    render(
      <Field label="Entry price" hint="Decimal" error="Required" required>
        {(a) => <input {...a} />}
      </Field>,
    );
    const input = screen.getByLabelText(/Entry price/);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input.getAttribute('aria-describedby')).toContain('error');
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(screen.queryByText('Decimal')).toBeNull();
  });
});

describe('SegmentedControl', () => {
  it('is a radiogroup with arrow-key selection', async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Direction"
        value="LONG"
        onChange={onChange}
        options={[
          { value: 'LONG', label: 'Long' },
          { value: 'SHORT', label: 'Short' },
        ]}
      />,
    );
    expect(screen.getByRole('radiogroup', { name: 'Direction' })).toBeInTheDocument();
    const long = screen.getByRole('radio', { name: 'Long' });
    expect(long).toHaveAttribute('aria-checked', 'true');
    expect(long).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: 'Short' })).toHaveAttribute('tabindex', '-1');
    long.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith('SHORT');
  });
});

describe('ErrorState', () => {
  it('announces and offers retry', async () => {
    const retry = vi.fn();
    render(<ErrorState title="Could not load trades" onRetry={retry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load trades');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalled();
  });
});

describe('Money and chips', () => {
  it('shows sign and currency and colours by sign', () => {
    const { container } = render(
      <>
        <Money value={-12.5} currency="USD" data-testid="loss" />
        <Money value={7} currency="INR" data-testid="win" />
        <RMultiple value={2} />
      </>,
    );
    expect(screen.getByTestId('loss')).toHaveTextContent('−$12.50');
    expect(screen.getByTestId('loss').className).toContain('text-loss');
    expect(screen.getByTestId('win')).toHaveTextContent('+₹7.00');
    expect(container).toHaveTextContent('+2.00R');
  });

  it('labels direction and outcome in words', () => {
    render(
      <>
        <DirectionChip direction="SHORT" />
        <OutcomeChip outcome="SL" />
      </>,
    );
    expect(screen.getByText('Short')).toBeInTheDocument();
    expect(screen.getByText('SL hit')).toBeInTheDocument();
  });
});

describe('Panel', () => {
  it('renders a titled section', () => {
    render(<Panel title="Goals">content</Panel>);
    expect(screen.getByRole('heading', { name: 'Goals' })).toBeInTheDocument();
  });
});
