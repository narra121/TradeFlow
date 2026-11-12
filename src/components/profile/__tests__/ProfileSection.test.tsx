import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileSection } from '../ProfileSection';

const useProfile = vi.fn();
vi.mock('@/hooks/useProfile', async (orig) => ({ ...(await orig<typeof import('@/hooks/useProfile')>()), useProfile: () => useProfile() }));

const base = { name: 'Ada', email: 'ada@example.com', method: 'password', hasName: true, isLoading: false, isError: false, refetch: vi.fn(), isSaving: false };

describe('ProfileSection', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the name editable, the email read-only and the sign-in method', () => {
    useProfile.mockReturnValue({ ...base, saveName: vi.fn() });
    render(<ProfileSection />);
    expect(screen.getByLabelText('Name')).toHaveValue('Ada');
    expect(screen.getByTestId('profile-email')).toHaveTextContent('ada@example.com');
    expect(screen.getByText('Signs in with email and password')).toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).toBeNull();
  });

  it('keeps Save disabled until the name changes, then saves and shows Saved', async () => {
    const saveName = vi.fn().mockResolvedValue(undefined);
    useProfile.mockReturnValue({ ...base, saveName });
    const user = userEvent.setup();
    render(<ProfileSection />);
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();
    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Ada Lovelace');
    expect(save).toBeEnabled();
    await user.click(save);
    expect(saveName).toHaveBeenCalledWith('Ada Lovelace');
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('shows a blank-name message inline and does not call the API', async () => {
    const saveName = vi.fn();
    useProfile.mockReturnValue({ ...base, saveName });
    const user = userEvent.setup();
    render(<ProfileSection />);
    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), '  ');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter the name');
    expect(saveName).not.toHaveBeenCalled();
  });

  it('shows the server error inline when saving fails and keeps the typed value', async () => {
    const saveName = vi.fn().mockRejectedValue({ status: 500, data: { message: 'Profile service is down' } });
    useProfile.mockReturnValue({ ...base, saveName });
    const user = userEvent.setup();
    render(<ProfileSection />);
    await user.type(screen.getByLabelText('Name'), 'x');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Profile service is down'));
    expect(screen.getByLabelText('Name')).toHaveValue('Adax');
  });

  it('shows a loading skeleton and an error state with Retry', async () => {
    useProfile.mockReturnValue({ ...base, isLoading: true, saveName: vi.fn() });
    const { rerender } = render(<ProfileSection />);
    expect(screen.getByLabelText('Loading your profile')).toBeInTheDocument();
    const refetch = vi.fn();
    useProfile.mockReturnValue({ ...base, isError: true, refetch, saveName: vi.fn() });
    rerender(<ProfileSection />);
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('labels a Google user', () => {
    useProfile.mockReturnValue({ ...base, method: 'google', saveName: vi.fn() });
    render(<ProfileSection />);
    expect(screen.getByText('Signs in with Google')).toBeInTheDocument();
  });
});
