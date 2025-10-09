import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { UserProfile } from './UserProfile';

vi.mock('./TodoList', () => ({
  TodoList: ({ organizationId }: { organizationId: string }) => (
    <div data-testid="todo-list" data-organization-id={organizationId}>
      TodoList Component
    </div>
  ),
}));

vi.mock('./OrganizationSelector', () => ({
  OrganizationSelector: ({
    selectedOrgId,
    onOrganizationChange,
  }: {
    selectedOrgId: string;
    onOrganizationChange: (orgId: string) => void;
  }) => (
    <div data-testid="organization-selector">
      <span data-testid="selected-org-id">{selectedOrgId}</span>
      <button onClick={() => onOrganizationChange('new-org-id')}>
        Change Organization
      </button>
    </div>
  ),
}));

describe('UserProfile', () => {
  const getMockUser = () => ({
    id: '123e4567-e89b-12d3-a456-426614174000',
    username: 'testuser',
    email: 'test@example.com',
  });

  const renderUserProfile = (
    user: ReturnType<typeof getMockUser>,
    onLogout: () => void,
  ) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    return render(
      <ChakraProvider value={defaultSystem}>
        <QueryClientProvider client={queryClient}>
          <UserProfile user={user} onLogout={onLogout} />
        </QueryClientProvider>
      </ChakraProvider>,
    );
  };

  it('should display user information', () => {
    const user = getMockUser();
    const onLogout = vi.fn();

    renderUserProfile(user, onLogout);

    expect(screen.getByText('Welcome, testuser!')).toBeInTheDocument();
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    // User ID appears in both OrganizationSelector and user info display
    const userIds = screen.getAllByText('123e4567-e89b-12d3-a456-426614174000');
    expect(userIds.length).toBeGreaterThan(0);
  });

  it('should call onLogout when logout button is clicked', async () => {
    const user = getMockUser();
    const onLogout = vi.fn();

    renderUserProfile(user, onLogout);

    const logoutButton = screen.getByRole('button', { name: /logout/i });
    await userEvent.click(logoutButton);

    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('should display username in welcome message', () => {
    const user = { ...getMockUser(), username: 'alice' };
    const onLogout = vi.fn();

    renderUserProfile(user, onLogout);

    expect(screen.getByText('Welcome, alice!')).toBeInTheDocument();
  });

  it('should display all user fields with labels', () => {
    const user = getMockUser();
    const onLogout = vi.fn();

    renderUserProfile(user, onLogout);

    expect(screen.getByText(/Username:/)).toBeInTheDocument();
    expect(screen.getByText(/Email:/)).toBeInTheDocument();
    expect(screen.getByText(/User ID:/)).toBeInTheDocument();
  });

  it('should display the TodoList component', () => {
    const user = getMockUser();
    const onLogout = vi.fn();

    renderUserProfile(user, onLogout);

    expect(screen.getByTestId('todo-list')).toBeInTheDocument();
  });

  it('should display the OrganizationSelector component', () => {
    const user = getMockUser();
    const onLogout = vi.fn();

    renderUserProfile(user, onLogout);

    expect(screen.getByTestId('organization-selector')).toBeInTheDocument();
  });

  it('should initialize OrganizationSelector with user id as selected organization', () => {
    const user = getMockUser();
    const onLogout = vi.fn();

    renderUserProfile(user, onLogout);

    expect(screen.getByTestId('selected-org-id')).toHaveTextContent(user.id);
  });

  it('should pass selected organization id to TodoList', () => {
    const user = getMockUser();
    const onLogout = vi.fn();

    renderUserProfile(user, onLogout);

    const todoList = screen.getByTestId('todo-list');
    expect(todoList).toHaveAttribute('data-organization-id', user.id);
  });

  it('should update TodoList organization when organization changes', async () => {
    const user = getMockUser();
    const onLogout = vi.fn();

    renderUserProfile(user, onLogout);

    // Initially should be user.id
    let todoList = screen.getByTestId('todo-list');
    expect(todoList).toHaveAttribute('data-organization-id', user.id);

    // Change organization
    const changeButton = screen.getByRole('button', {
      name: /change organization/i,
    });
    await userEvent.click(changeButton);

    // Should update to new organization
    todoList = screen.getByTestId('todo-list');
    expect(todoList).toHaveAttribute('data-organization-id', 'new-org-id');
  });
});
