import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App.tsx';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

describe('App', () => {
  it('should render the todo app with login form', () => {
    const queryClient = createTestQueryClient();
    const { getByRole, getByLabelText } = render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>,
    );

    expect(getByRole('heading', { name: 'Todo App' })).toBeInTheDocument();
    expect(getByRole('heading', { name: 'Login' })).toBeInTheDocument();
    expect(getByLabelText('Username or Email')).toBeInTheDocument();
    expect(getByLabelText('Password')).toBeInTheDocument();
  });
});
