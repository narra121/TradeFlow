import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RefreshButton } from '../refresh-button';

// Mock Radix UI Tooltip so content renders inline (no portal)
vi.mock('@radix-ui/react-tooltip', async () => {
  const React = await import('react');
  return {
    Provider: ({ children }: any) => <>{children}</>,
    Root: ({ children }: any) => <>{children}</>,
    Trigger: React.forwardRef(({ children, asChild, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    )),
    Portal: ({ children }: any) => <>{children}</>,
    Content: React.forwardRef(({ children, side, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    )),
    Arrow: React.forwardRef((props: any, ref: any) => <div ref={ref} {...props} />),
  };
});

describe('RefreshButton', () => {
  const defaultProps = {
    onRefresh: vi.fn(),
    isFetching: false,
  };

  it('renders a button with RefreshCw icon', () => {
    const { container } = render(<RefreshButton {...defaultProps} />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    // lucide-react RefreshCw renders as an SVG
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('calls onRefresh callback when clicked', async () => {
    const onRefresh = vi.fn();
    render(<RefreshButton onRefresh={onRefresh} isFetching={false} />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button'));

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('button is disabled when isFetching is true', () => {
    render(<RefreshButton onRefresh={vi.fn()} isFetching={true} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('does not call onRefresh when disabled (isFetching=true)', async () => {
    const onRefresh = vi.fn();
    render(<RefreshButton onRefresh={onRefresh} isFetching={true} />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button'));

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('shows animate-spin class on the icon when isFetching is true', () => {
    const { container } = render(
      <RefreshButton onRefresh={vi.fn()} isFetching={true} />
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg!.classList.contains('animate-spin')).toBe(true);
  });

  it('does not show animate-spin class when isFetching is false', () => {
    const { container } = render(
      <RefreshButton onRefresh={vi.fn()} isFetching={false} />
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg!.classList.contains('animate-spin')).toBe(false);
  });

  it('tooltip shows "Refreshing..." when isFetching is true', () => {
    render(<RefreshButton onRefresh={vi.fn()} isFetching={true} />);
    expect(screen.getByText('Refreshing...')).toBeInTheDocument();
  });

  it('tooltip shows "Refresh data" when isFetching is false', () => {
    render(<RefreshButton onRefresh={vi.fn()} isFetching={false} />);
    expect(screen.getByText('Refresh data')).toBeInTheDocument();
  });

  it('applies custom className to the button', () => {
    render(
      <RefreshButton onRefresh={vi.fn()} isFetching={false} className="my-custom" />
    );
    const button = screen.getByRole('button');
    expect(button.className).toContain('my-custom');
  });
});
