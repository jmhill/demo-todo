import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { TodoList } from './TodoList';
import { tsr } from '../lib/api-client';

vi.mock('../lib/api-client', () => ({
  tsr: {
    todos: {
      listTodos: {
        useQuery: vi.fn(),
      },
      completeTodo: {
        useMutation: vi.fn(),
      },
      createTodo: {
        useMutation: vi.fn(),
      },
    },
  },
}));

describe('TodoList', () => {
  beforeEach(() => {
    // Set default mock for completeTodo mutation
    vi.mocked(tsr.todos.completeTodo.useMutation).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      isIdle: true,
      isError: false,
      isSuccess: false,
      data: undefined,
      error: null,
      variables: undefined,
      status: 'idle',
      reset: vi.fn(),
      context: undefined,
      failureCount: 0,
      failureReason: null,
      submittedAt: 0,
    } as unknown as ReturnType<typeof tsr.todos.completeTodo.useMutation>);

    // Set default mock for createTodo mutation
    vi.mocked(tsr.todos.createTodo.useMutation).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      isIdle: true,
      isError: false,
      isSuccess: false,
      data: undefined,
      error: null,
      variables: undefined,
      status: 'idle',
      reset: vi.fn(),
      context: undefined,
      failureCount: 0,
      failureReason: null,
      submittedAt: 0,
    } as unknown as ReturnType<typeof tsr.todos.createTodo.useMutation>);
  });

  const renderTodoList = (organizationId = 'org-123') => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    const user = userEvent.setup();

    return {
      user,
      ...render(
        <ChakraProvider value={defaultSystem}>
          <QueryClientProvider client={queryClient}>
            <TodoList organizationId={organizationId} />
          </QueryClientProvider>
        </ChakraProvider>,
      ),
    };
  };

  it('should display loading state while fetching todos', () => {
    vi.mocked(tsr.todos.listTodos.useQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      isError: false,
    } as ReturnType<typeof tsr.todos.listTodos.useQuery>);

    renderTodoList();

    expect(screen.getByText('Loading todos...')).toBeInTheDocument();
  });

  it('should display error message when fetch fails', () => {
    vi.mocked(tsr.todos.listTodos.useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network error'),
      isError: true,
    } as ReturnType<typeof tsr.todos.listTodos.useQuery>);

    renderTodoList();

    expect(screen.getByText('Failed to load todos')).toBeInTheDocument();
  });

  it('should display empty state when no todos exist', async () => {
    vi.mocked(tsr.todos.listTodos.useQuery).mockReturnValue({
      data: { status: 200, body: [] },
      isLoading: false,
      error: null,
      isError: false,
    } as ReturnType<typeof tsr.todos.listTodos.useQuery>);

    renderTodoList();

    await waitFor(() => {
      expect(screen.getByText('No todos yet')).toBeInTheDocument();
    });
  });

  it('should display list of todos when data is loaded', async () => {
    const mockTodos = [
      {
        id: '1',
        userId: 'user-123',
        title: 'Buy groceries',
        description: 'Get milk and eggs',
        completed: false,
        createdAt: '2025-01-01T10:00:00Z',
        updatedAt: '2025-01-01T10:00:00Z',
      },
      {
        id: '2',
        userId: 'user-123',
        title: 'Write tests',
        description: 'Add unit tests',
        completed: false,
        createdAt: '2025-01-01T11:00:00Z',
        updatedAt: '2025-01-01T12:00:00Z',
      },
    ];

    vi.mocked(tsr.todos.listTodos.useQuery).mockReturnValue({
      data: { status: 200, body: mockTodos },
      isLoading: false,
      error: null,
      isError: false,
    } as ReturnType<typeof tsr.todos.listTodos.useQuery>);

    renderTodoList();

    await waitFor(() => {
      expect(screen.getByText('Buy groceries')).toBeInTheDocument();
      expect(screen.getByText('Get milk and eggs')).toBeInTheDocument();
      expect(screen.getByText('Write tests')).toBeInTheDocument();
      expect(screen.getByText('Add unit tests')).toBeInTheDocument();
    });
  });

  it('should display todo with no description', async () => {
    const mockTodos = [
      {
        id: '1',
        userId: 'user-123',
        title: 'Simple todo',
        completed: false,
        createdAt: '2025-01-01T10:00:00Z',
        updatedAt: '2025-01-01T10:00:00Z',
      },
    ];

    vi.mocked(tsr.todos.listTodos.useQuery).mockReturnValue({
      data: { status: 200, body: mockTodos },
      isLoading: false,
      error: null,
      isError: false,
    } as ReturnType<typeof tsr.todos.listTodos.useQuery>);

    renderTodoList();

    await waitFor(() => {
      expect(screen.getByText('Simple todo')).toBeInTheDocument();
      expect(screen.queryByText('Get milk and eggs')).not.toBeInTheDocument();
    });
  });

  it('should only display incomplete todos', async () => {
    const mockTodos = [
      {
        id: '1',
        userId: 'user-123',
        title: 'Incomplete task',
        completed: false,
        createdAt: '2025-01-01T10:00:00Z',
        updatedAt: '2025-01-01T10:00:00Z',
      },
      {
        id: '2',
        userId: 'user-123',
        title: 'Completed task',
        completed: true,
        createdAt: '2025-01-01T11:00:00Z',
        updatedAt: '2025-01-01T12:00:00Z',
        completedAt: '2025-01-01T12:00:00Z',
      },
    ];

    vi.mocked(tsr.todos.listTodos.useQuery).mockReturnValue({
      data: { status: 200, body: mockTodos },
      isLoading: false,
      error: null,
      isError: false,
    } as ReturnType<typeof tsr.todos.listTodos.useQuery>);

    renderTodoList();

    await waitFor(() => {
      expect(screen.getByText('Incomplete task')).toBeInTheDocument();
      expect(screen.queryByText('Completed task')).not.toBeInTheDocument();
    });
  });

  it('should display checkbox for each incomplete todo', async () => {
    const mockTodos = [
      {
        id: '1',
        userId: 'user-123',
        title: 'Task to complete',
        completed: false,
        createdAt: '2025-01-01T10:00:00Z',
        updatedAt: '2025-01-01T10:00:00Z',
      },
    ];

    vi.mocked(tsr.todos.listTodos.useQuery).mockReturnValue({
      data: { status: 200, body: mockTodos },
      isLoading: false,
      error: null,
      isError: false,
    } as ReturnType<typeof tsr.todos.listTodos.useQuery>);

    renderTodoList();

    await waitFor(() => {
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).not.toBeChecked();
    });
  });

  it('should call completeTodo mutation when checkbox is clicked', async () => {
    const mockMutate = vi.fn();
    const mockTodos = [
      {
        id: '1',
        userId: 'user-123',
        title: 'Task to complete',
        completed: false,
        createdAt: '2025-01-01T10:00:00Z',
        updatedAt: '2025-01-01T10:00:00Z',
      },
    ];

    vi.mocked(tsr.todos.listTodos.useQuery).mockReturnValue({
      data: { status: 200, body: mockTodos },
      isLoading: false,
      error: null,
      isError: false,
    } as ReturnType<typeof tsr.todos.listTodos.useQuery>);

    vi.mocked(tsr.todos.completeTodo.useMutation).mockReturnValue({
      mutate: mockMutate,
      mutateAsync: vi.fn(),
      isPending: false,
      isIdle: true,
      isError: false,
      isSuccess: false,
      data: undefined,
      error: null,
      variables: undefined,
      status: 'idle',
      reset: vi.fn(),
      context: undefined,
      failureCount: 0,
      failureReason: null,
      submittedAt: 0,
    } as unknown as ReturnType<typeof tsr.todos.completeTodo.useMutation>);

    const { user } = renderTodoList();

    const checkbox = await screen.findByRole('checkbox');
    await user.click(checkbox);

    expect(mockMutate).toHaveBeenCalledWith({
      params: { orgId: 'org-123', id: '1' },
      body: undefined,
    });
  });

  describe('Creating Todos', () => {
    it('should display form fields for creating a new todo', async () => {
      vi.mocked(tsr.todos.listTodos.useQuery).mockReturnValue({
        data: { status: 200, body: [] },
        isLoading: false,
        error: null,
        isError: false,
      } as ReturnType<typeof tsr.todos.listTodos.useQuery>);

      renderTodoList();

      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toBeInTheDocument();
        expect(screen.getByLabelText('Description')).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: 'Add Todo' }),
        ).toBeInTheDocument();
      });
    });

    it('should call createTodo mutation when form is submitted', async () => {
      const mockMutate = vi.fn();

      vi.mocked(tsr.todos.listTodos.useQuery).mockReturnValue({
        data: { status: 200, body: [] },
        isLoading: false,
        error: null,
        isError: false,
      } as ReturnType<typeof tsr.todos.listTodos.useQuery>);

      vi.mocked(tsr.todos.createTodo.useMutation).mockReturnValue({
        mutate: mockMutate,
        mutateAsync: vi.fn(),
        isPending: false,
        isIdle: true,
        isError: false,
        isSuccess: false,
        data: undefined,
        error: null,
        variables: undefined,
        status: 'idle',
        reset: vi.fn(),
        context: undefined,
        failureCount: 0,
        failureReason: null,
        submittedAt: 0,
      } as unknown as ReturnType<typeof tsr.todos.createTodo.useMutation>);

      const { user } = renderTodoList();

      await user.type(screen.getByLabelText('Title'), 'New Todo');
      await user.type(screen.getByLabelText('Description'), 'Todo description');
      await user.click(screen.getByRole('button', { name: 'Add Todo' }));

      expect(mockMutate).toHaveBeenCalledWith(
        {
          params: { orgId: 'org-123' },
          body: {
            title: 'New Todo',
            description: 'Todo description',
          },
        },
        expect.any(Object),
      );
    });

    it('should create todo without description', async () => {
      const mockMutate = vi.fn();

      vi.mocked(tsr.todos.listTodos.useQuery).mockReturnValue({
        data: { status: 200, body: [] },
        isLoading: false,
        error: null,
        isError: false,
      } as ReturnType<typeof tsr.todos.listTodos.useQuery>);

      vi.mocked(tsr.todos.createTodo.useMutation).mockReturnValue({
        mutate: mockMutate,
        mutateAsync: vi.fn(),
        isPending: false,
        isIdle: true,
        isError: false,
        isSuccess: false,
        data: undefined,
        error: null,
        variables: undefined,
        status: 'idle',
        reset: vi.fn(),
        context: undefined,
        failureCount: 0,
        failureReason: null,
        submittedAt: 0,
      } as unknown as ReturnType<typeof tsr.todos.createTodo.useMutation>);

      const { user } = renderTodoList();

      await user.type(screen.getByLabelText('Title'), 'Simple Todo');
      await user.click(screen.getByRole('button', { name: 'Add Todo' }));

      expect(mockMutate).toHaveBeenCalledWith(
        {
          params: { orgId: 'org-123' },
          body: {
            title: 'Simple Todo',
            description: '',
          },
        },
        expect.any(Object),
      );
    });

    it('should clear form after successful creation', async () => {
      const mockRefetch = vi.fn();

      vi.mocked(tsr.todos.listTodos.useQuery).mockReturnValue({
        data: { status: 200, body: [] },
        isLoading: false,
        error: null,
        isError: false,
        refetch: mockRefetch,
      } as unknown as ReturnType<typeof tsr.todos.listTodos.useQuery>);

      vi.mocked(tsr.todos.createTodo.useMutation).mockImplementation(
        () =>
          ({
            mutate: (
              variables: {
                params: { orgId: string };
                body: { title: string; description: string };
              },
              options?: {
                onSuccess?: (response: {
                  status: number;
                  body: {
                    id: string;
                    userId: string;
                    title: string;
                    description?: string;
                    completed: boolean;
                    createdAt: string;
                    updatedAt: string;
                  };
                }) => void;
              },
            ) => {
              // Simulate successful creation
              options?.onSuccess?.({
                status: 201,
                body: {
                  id: 'new-todo-id',
                  userId: 'user-123',
                  title: variables.body.title,
                  description: variables.body.description,
                  completed: false,
                  createdAt: '2025-01-01T10:00:00Z',
                  updatedAt: '2025-01-01T10:00:00Z',
                },
              });
            },
            mutateAsync: vi.fn(),
            isPending: false,
            isIdle: true,
            isError: false,
            isSuccess: false,
            data: undefined,
            error: null,
            variables: undefined,
            status: 'idle',
            reset: vi.fn(),
            context: undefined,
            failureCount: 0,
            failureReason: null,
            submittedAt: 0,
          }) as unknown as ReturnType<typeof tsr.todos.createTodo.useMutation>,
      );

      const { user } = renderTodoList();

      const titleInput = screen.getByLabelText('Title');
      const descriptionInput = screen.getByLabelText('Description');

      await user.type(titleInput, 'Test Todo');
      await user.type(descriptionInput, 'Test Description');
      await user.click(screen.getByRole('button', { name: 'Add Todo' }));

      await waitFor(() => {
        expect(titleInput).toHaveValue('');
        expect(descriptionInput).toHaveValue('');
      });
    });

    it('should display error message when creation fails', async () => {
      vi.mocked(tsr.todos.listTodos.useQuery).mockReturnValue({
        data: { status: 200, body: [] },
        isLoading: false,
        error: null,
        isError: false,
      } as unknown as ReturnType<typeof tsr.todos.listTodos.useQuery>);

      vi.mocked(tsr.todos.createTodo.useMutation).mockImplementation(
        () =>
          ({
            mutate: (
              _variables: {
                params: { orgId: string };
                body: { title: string; description: string };
              },
              options?: {
                onSuccess?: (response: {
                  status: number;
                  body: { message: string; code: string };
                }) => void;
              },
            ) => {
              // Simulate error response
              options?.onSuccess?.({
                status: 500,
                body: {
                  message: 'Failed to create todo',
                  code: 'UNEXPECTED_ERROR',
                },
              });
            },
            mutateAsync: vi.fn(),
            isPending: false,
            isIdle: true,
            isError: false,
            isSuccess: false,
            data: undefined,
            error: null,
            variables: undefined,
            status: 'idle',
            reset: vi.fn(),
            context: undefined,
            failureCount: 0,
            failureReason: null,
            submittedAt: 0,
          }) as unknown as ReturnType<typeof tsr.todos.createTodo.useMutation>,
      );

      const { user } = renderTodoList();

      await user.type(screen.getByLabelText('Title'), 'Test Todo');
      await user.click(screen.getByRole('button', { name: 'Add Todo' }));

      await waitFor(() => {
        expect(screen.getByText('Failed to create todo')).toBeInTheDocument();
      });
    });
  });

  describe('Completed Todos Visibility', () => {
    it('should display link to show completed todos when they exist', async () => {
      const mockTodos = [
        {
          id: '1',
          userId: 'user-123',
          title: 'Incomplete task',
          completed: false,
          createdAt: '2025-01-01T10:00:00Z',
          updatedAt: '2025-01-01T10:00:00Z',
        },
        {
          id: '2',
          userId: 'user-123',
          title: 'Completed task',
          completed: true,
          createdAt: '2025-01-01T11:00:00Z',
          updatedAt: '2025-01-01T12:00:00Z',
          completedAt: '2025-01-01T12:00:00Z',
        },
      ];

      vi.mocked(tsr.todos.listTodos.useQuery).mockReturnValue({
        data: { status: 200, body: mockTodos },
        isLoading: false,
        error: null,
        isError: false,
      } as unknown as ReturnType<typeof tsr.todos.listTodos.useQuery>);

      renderTodoList();

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /show completed/i }),
        ).toBeInTheDocument();
      });
    });

    it('should show count of completed todos in the link text', async () => {
      const mockTodos = [
        {
          id: '1',
          userId: 'user-123',
          title: 'Incomplete task',
          completed: false,
          createdAt: '2025-01-01T10:00:00Z',
          updatedAt: '2025-01-01T10:00:00Z',
        },
        {
          id: '2',
          userId: 'user-123',
          title: 'Completed task 1',
          completed: true,
          createdAt: '2025-01-01T11:00:00Z',
          updatedAt: '2025-01-01T12:00:00Z',
          completedAt: '2025-01-01T12:00:00Z',
        },
        {
          id: '3',
          userId: 'user-123',
          title: 'Completed task 2',
          completed: true,
          createdAt: '2025-01-01T11:00:00Z',
          updatedAt: '2025-01-01T12:00:00Z',
          completedAt: '2025-01-01T12:00:00Z',
        },
      ];

      vi.mocked(tsr.todos.listTodos.useQuery).mockReturnValue({
        data: { status: 200, body: mockTodos },
        isLoading: false,
        error: null,
        isError: false,
      } as unknown as ReturnType<typeof tsr.todos.listTodos.useQuery>);

      renderTodoList();

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Show completed (2)' }),
        ).toBeInTheDocument();
      });
    });

    it('should display completed todos with strikethrough styling when link is clicked', async () => {
      const mockTodos = [
        {
          id: '1',
          userId: 'user-123',
          title: 'Incomplete task',
          description: 'Still working on this',
          completed: false,
          createdAt: '2025-01-01T10:00:00Z',
          updatedAt: '2025-01-01T10:00:00Z',
        },
        {
          id: '2',
          userId: 'user-123',
          title: 'Completed task',
          description: 'This is done',
          completed: true,
          createdAt: '2025-01-01T11:00:00Z',
          updatedAt: '2025-01-01T12:00:00Z',
          completedAt: '2025-01-01T12:00:00Z',
        },
      ];

      vi.mocked(tsr.todos.listTodos.useQuery).mockReturnValue({
        data: { status: 200, body: mockTodos },
        isLoading: false,
        error: null,
        isError: false,
      } as unknown as ReturnType<typeof tsr.todos.listTodos.useQuery>);

      const { user } = renderTodoList();

      // Click the show completed link
      await user.click(screen.getByRole('button', { name: /show completed/i }));

      // Completed todo should be visible
      expect(await screen.findByText('Completed task')).toBeInTheDocument();
      expect(screen.getByText('This is done')).toBeInTheDocument();

      // Check for strikethrough styling on completed todo
      const completedTitle = screen.getByText('Completed task');
      expect(completedTitle).toHaveStyle({ textDecoration: 'line-through' });

      const completedDescription = screen.getByText('This is done');
      expect(completedDescription).toHaveStyle({
        textDecoration: 'line-through',
      });

      // Incomplete todo should NOT have strikethrough
      const incompleteTitle = screen.getByText('Incomplete task');
      expect(incompleteTitle).not.toHaveStyle({
        textDecoration: 'line-through',
      });
    });

    it('should hide completed todos when hide completed link is clicked', async () => {
      const mockTodos = [
        {
          id: '1',
          userId: 'user-123',
          title: 'Incomplete task',
          completed: false,
          createdAt: '2025-01-01T10:00:00Z',
          updatedAt: '2025-01-01T10:00:00Z',
        },
        {
          id: '2',
          userId: 'user-123',
          title: 'Completed task',
          completed: true,
          createdAt: '2025-01-01T11:00:00Z',
          updatedAt: '2025-01-01T12:00:00Z',
          completedAt: '2025-01-01T12:00:00Z',
        },
      ];

      vi.mocked(tsr.todos.listTodos.useQuery).mockReturnValue({
        data: { status: 200, body: mockTodos },
        isLoading: false,
        error: null,
        isError: false,
      } as unknown as ReturnType<typeof tsr.todos.listTodos.useQuery>);

      const { user } = renderTodoList();

      // Show completed todos
      await user.click(screen.getByRole('button', { name: /show completed/i }));

      expect(await screen.findByText('Completed task')).toBeInTheDocument();

      // Hide completed todos
      await user.click(screen.getByRole('button', { name: /hide completed/i }));

      await waitFor(() => {
        expect(screen.queryByText('Completed task')).not.toBeInTheDocument();
      });
      expect(screen.getByText('Incomplete task')).toBeInTheDocument();
    });

    it('should show checked checkbox for completed todos', async () => {
      const mockTodos = [
        {
          id: '1',
          userId: 'user-123',
          title: 'Incomplete task',
          completed: false,
          createdAt: '2025-01-01T10:00:00Z',
          updatedAt: '2025-01-01T10:00:00Z',
        },
        {
          id: '2',
          userId: 'user-123',
          title: 'Completed task',
          completed: true,
          createdAt: '2025-01-01T11:00:00Z',
          updatedAt: '2025-01-01T12:00:00Z',
          completedAt: '2025-01-01T12:00:00Z',
        },
      ];

      vi.mocked(tsr.todos.listTodos.useQuery).mockReturnValue({
        data: { status: 200, body: mockTodos },
        isLoading: false,
        error: null,
        isError: false,
      } as unknown as ReturnType<typeof tsr.todos.listTodos.useQuery>);

      const { user } = renderTodoList();

      // Show completed todos
      await user.click(screen.getByRole('button', { name: /show completed/i }));

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes).toHaveLength(2);
        // First checkbox (incomplete) should be unchecked
        expect(checkboxes[0]).not.toBeChecked();
        // Second checkbox (completed) should be checked
        expect(checkboxes[1]).toBeChecked();
      });
    });

    it('should not show toggle link when no completed todos exist', async () => {
      const mockTodos = [
        {
          id: '1',
          userId: 'user-123',
          title: 'Incomplete task',
          completed: false,
          createdAt: '2025-01-01T10:00:00Z',
          updatedAt: '2025-01-01T10:00:00Z',
        },
      ];

      vi.mocked(tsr.todos.listTodos.useQuery).mockReturnValue({
        data: { status: 200, body: mockTodos },
        isLoading: false,
        error: null,
        isError: false,
      } as unknown as ReturnType<typeof tsr.todos.listTodos.useQuery>);

      renderTodoList();

      await waitFor(() => {
        expect(screen.getByText('Incomplete task')).toBeInTheDocument();
      });

      expect(
        screen.queryByRole('button', { name: /show completed/i }),
      ).not.toBeInTheDocument();
    });
  });
});
