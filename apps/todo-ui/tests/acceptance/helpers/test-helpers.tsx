import { type ReactElement } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';

/**
 * Creates a React Query client configured for testing
 * - Disables retries to make tests deterministic
 * - Disables caching to ensure fresh state per test
 */
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

/**
 * Renders a component with all required providers
 * - ChakraProvider for UI components
 * - QueryClientProvider for React Query
 */
export const renderWithProviders = (ui: ReactElement) => {
  const queryClient = createTestQueryClient();

  return render(
    <ChakraProvider value={defaultSystem}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </ChakraProvider>,
  );
};

/**
 * Sets up an authenticated user in localStorage
 * Useful for tests that need to start with a logged-in state
 */
export const setupAuthenticatedUser = () => {
  const user = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    username: 'alice',
    email: 'alice@example.com',
  };
  const token = 'mock-jwt-token-12345';

  localStorage.setItem('auth_token', token);
  localStorage.setItem('auth_user', JSON.stringify(user));

  return { user, token };
};
