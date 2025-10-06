import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { App } from '../../../src/App';
import {
  renderWithProviders,
  setupAuthenticatedUser,
} from '../helpers/test-helpers';
import { server } from '../mocks/server';
import { addMockTodos, clearMockTodos } from '../mocks/handlers';
import {
  createTestTodo,
  createTestErrorResponse,
  generateTestUuid,
} from '../fixtures/test-data';

describe('Todo Creation (Acceptance)', () => {
  beforeEach(() => {
    setupAuthenticatedUser();
    clearMockTodos();
  });

  describe('Creating Todos', () => {
    it('should display form to create a new todo', async () => {
      renderWithProviders(<App />);

      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toBeInTheDocument();
        expect(screen.getByLabelText('Description')).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: 'Add Todo' }),
        ).toBeInTheDocument();
      });
    });

    // Skipped: MSW does not intercept React Query requests in vitest+jsdom
    // See docs/FRONTEND_ACCEPTANCE_TESTING_MSW_ISSUE.md
    it.skip('should create a new todo with title and description', async () => {
      const user = userEvent.setup();
      renderWithProviders(<App />);

      // Fill in the form
      await user.type(screen.getByLabelText('Title'), 'Buy groceries');
      await user.type(
        screen.getByLabelText('Description'),
        'Milk, eggs, bread',
      );
      await user.click(screen.getByRole('button', { name: 'Add Todo' }));

      // Todo should appear in the list
      expect(await screen.findByText('Buy groceries')).toBeInTheDocument();
      expect(screen.getByText('Milk, eggs, bread')).toBeInTheDocument();

      // Form should be cleared
      expect(screen.getByLabelText('Title')).toHaveValue('');
      expect(screen.getByLabelText('Description')).toHaveValue('');
    });

    // Skipped: MSW does not intercept React Query requests in vitest+jsdom
    // See docs/FRONTEND_ACCEPTANCE_TESTING_MSW_ISSUE.md
    it.skip('should create a new todo with just a title', async () => {
      const user = userEvent.setup();
      renderWithProviders(<App />);

      await user.type(screen.getByLabelText('Title'), 'Simple task');
      await user.click(screen.getByRole('button', { name: 'Add Todo' }));

      // Todo should appear in the list
      expect(await screen.findByText('Simple task')).toBeInTheDocument();

      // Form should be cleared
      expect(screen.getByLabelText('Title')).toHaveValue('');
    });

    // Skipped: MSW does not intercept React Query requests in vitest+jsdom
    // See docs/FRONTEND_ACCEPTANCE_TESTING_MSW_ISSUE.md
    it.skip('should display error when creation fails', async () => {
      // Override handler to return error
      server.use(
        http.post('http://localhost:3000/todos', () => {
          return HttpResponse.json(
            createTestErrorResponse(
              'Failed to create todo',
              'UNEXPECTED_ERROR',
            ),
            { status: 500 },
          );
        }),
      );

      const user = userEvent.setup();
      renderWithProviders(<App />);

      await user.type(screen.getByLabelText('Title'), 'Test Todo');
      await user.click(screen.getByRole('button', { name: 'Add Todo' }));

      // Error message should appear
      expect(
        await screen.findByText('Failed to create todo'),
      ).toBeInTheDocument();
    });

    // Skipped: MSW does not intercept React Query requests in vitest+jsdom
    // See docs/FRONTEND_ACCEPTANCE_TESTING_MSW_ISSUE.md
    it.skip('should require title field', async () => {
      const user = userEvent.setup();
      renderWithProviders(<App />);

      // Try to submit without filling title
      await user.click(screen.getByRole('button', { name: 'Add Todo' }));

      // Should not create a todo - form validation should prevent submission
      await waitFor(() => {
        expect(screen.queryByText('No todos yet')).toBeInTheDocument();
      });
    });

    // Skipped: MSW does not intercept React Query requests in vitest+jsdom
    // See docs/FRONTEND_ACCEPTANCE_TESTING_MSW_ISSUE.md
    it.skip('should show newly created todo in the list', async () => {
      // Start with an existing todo
      const existingTodo = createTestTodo({
        id: generateTestUuid(1),
        title: 'Existing todo',
      });
      addMockTodos([existingTodo]);

      const user = userEvent.setup();
      renderWithProviders(<App />);

      // Wait for existing todo to load
      await screen.findByText('Existing todo');

      // Create a new todo
      await user.type(screen.getByLabelText('Title'), 'New todo');
      await user.click(screen.getByRole('button', { name: 'Add Todo' }));

      // Both todos should be visible
      await waitFor(() => {
        expect(screen.getByText('Existing todo')).toBeInTheDocument();
        expect(screen.getByText('New todo')).toBeInTheDocument();
      });
    });
  });

  describe('Authentication Required', () => {
    it('should not allow creating todos when not authenticated', () => {
      localStorage.clear();

      renderWithProviders(<App />);

      // Should show login form, not todo creation form
      expect(
        screen.getByRole('heading', { name: 'Login' }),
      ).toBeInTheDocument();
      expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
    });
  });
});
