// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logIn, signUp } from '../../services/apiClient';
import { useAuthStore } from '../../store/useAuthStore';
import { AuthPage } from './AuthPage';

vi.mock('../../services/apiClient', () => ({ logIn: vi.fn(), signUp: vi.fn() }));

beforeEach(() => useAuthStore.setState({ token: null, username: null }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const fill = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('AuthPage', () => {
  it('logs in and stores the session', async () => {
    vi.mocked(logIn).mockResolvedValue({ token: 't1', username: 'frog' });
    render(<AuthPage />);
    fill(/Username/, ' frog ');
    fill(/^Password/, 'secret1');
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
    await waitFor(() => expect(useAuthStore.getState().token).toBe('t1'));
    expect(logIn).toHaveBeenCalledWith('frog', 'secret1');
  });

  it('shows the server error for wrong credentials', async () => {
    vi.mocked(logIn).mockRejectedValue(new Error('Wrong username or password'));
    render(<AuthPage />);
    fill(/Username/, 'frog');
    fill(/^Password/, 'secret1');
    fireEvent.submit(screen.getByRole('button', { name: 'Log in' }).closest('form')!);
    expect((await screen.findByRole('alert')).textContent).toBe('Wrong username or password');
    expect(useAuthStore.getState().token).toBeNull();
  });

  it('signs up only when both passwords match', async () => {
    vi.mocked(signUp).mockResolvedValue({ token: 't2', username: 'toad' });
    render(<AuthPage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Sign up' }));
    fill(/Username/, 'toad');
    fill(/^Password/, 'secret1');
    fill(/Confirm password/, 'different');
    fireEvent.submit(screen.getByRole('button', { name: 'Create account' }).closest('form')!);
    expect((await screen.findByRole('alert')).textContent).toBe('Passwords do not match');
    expect(signUp).not.toHaveBeenCalled();

    fill(/Confirm password/, 'secret1');
    fireEvent.submit(screen.getByRole('button', { name: 'Create account' }).closest('form')!);
    await waitFor(() => expect(useAuthStore.getState().username).toBe('toad'));
  });
});
