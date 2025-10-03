import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserProfile } from './UserProfile';

describe('UserProfile', () => {
  const getMockUser = () => ({
    id: '123e4567-e89b-12d3-a456-426614174000',
    username: 'testuser',
    email: 'test@example.com',
  });

  it('should display user information', () => {
    const user = getMockUser();
    const onLogout = vi.fn();

    render(<UserProfile user={user} onLogout={onLogout} />);

    expect(screen.getByText('Welcome, testuser!')).toBeInTheDocument();
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(
      screen.getByText('123e4567-e89b-12d3-a456-426614174000'),
    ).toBeInTheDocument();
  });

  it('should call onLogout when logout button is clicked', async () => {
    const user = getMockUser();
    const onLogout = vi.fn();

    render(<UserProfile user={user} onLogout={onLogout} />);

    const logoutButton = screen.getByRole('button', { name: /logout/i });
    await userEvent.click(logoutButton);

    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('should display username in welcome message', () => {
    const user = { ...getMockUser(), username: 'alice' };
    const onLogout = vi.fn();

    render(<UserProfile user={user} onLogout={onLogout} />);

    expect(screen.getByText('Welcome, alice!')).toBeInTheDocument();
  });

  it('should display all user fields with labels', () => {
    const user = getMockUser();
    const onLogout = vi.fn();

    render(<UserProfile user={user} onLogout={onLogout} />);

    expect(screen.getByText(/Username:/)).toBeInTheDocument();
    expect(screen.getByText(/Email:/)).toBeInTheDocument();
    expect(screen.getByText(/User ID:/)).toBeInTheDocument();
  });
});
