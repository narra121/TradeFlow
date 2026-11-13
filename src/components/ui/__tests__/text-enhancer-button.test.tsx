import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const toastError = vi.fn();
vi.mock('sonner', () => ({ toast: { error: (...a: unknown[]) => toastError(...a) } }));

const enhance = vi.fn();
vi.mock('@/store/api/textApi', () => ({
  useEnhanceTextMutation: () => [(arg: unknown) => ({ unwrap: () => enhance(arg) }), { isLoading: false }],
}));

import { TextEnhancerButton } from '../text-enhancer-button';

const click = async () => userEvent.click(screen.getByRole('button'));

describe('TextEnhancerButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hands the enhanced text to the caller', async () => {
    enhance.mockResolvedValue({ enhancedText: 'Better text' });
    const onEnhanced = vi.fn();
    render(<TextEnhancerButton text="rough" onEnhanced={onEnhanced} />);
    await click();
    await waitFor(() => expect(onEnhanced).toHaveBeenCalledWith('Better text'));
    expect(toastError).not.toHaveBeenCalled();
  });

  it('shows the API message of a failure as the toast description', async () => {
    enhance.mockRejectedValue({ status: 400, data: { success: false, message: 'Text is too long (max 2000 characters)', errorCode: 'VALIDATION_ERROR' } });
    render(<TextEnhancerButton text="rough" onEnhanced={vi.fn()} />);
    await click();
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Couldn't enhance the text.", { description: 'Text is too long (max 2000 characters)' }));
  });

  it('shows the connection message only when no response came back', async () => {
    enhance.mockRejectedValue({ status: 'FETCH_ERROR', error: 'TypeError: Failed to fetch' });
    render(<TextEnhancerButton text="rough" onEnhanced={vi.fn()} />);
    await click();
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Couldn't enhance the text.", { description: expect.stringMatching(/internet connection/i) }));
  });

  it('falls back to Try again for an error with no message', async () => {
    enhance.mockRejectedValue({ status: 500 });
    render(<TextEnhancerButton text="rough" onEnhanced={vi.fn()} />);
    await click();
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Couldn't enhance the text.", { description: 'Try again.' }));
  });
});
