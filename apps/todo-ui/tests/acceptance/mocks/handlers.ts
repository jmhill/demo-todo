import { http, HttpResponse } from 'msw';
import {
  LoginRequestSchema,
  CreateTodoRequestSchema,
} from '@demo-todo/api-contracts';
import {
  createTestLoginResponse,
  createTestTodo,
  createTestErrorResponse,
} from '../fixtures/test-data';

// In-memory store for test state
let currentUser: { id: string; username: string; email: string } | null = null;
const todos: Map<string, ReturnType<typeof createTestTodo>> = new Map();

export const handlers = [
  /**
   * POST /auth/login
   * ✅ Validates request body with LoginRequestSchema
   * ✅ Validates response with LoginResponseSchema
   */
  http.post('http://localhost:3000/auth/login', async ({ request }) => {
    const body = await request.json();

    // ✅ Validate request - BREAKS if contract changes
    const parseResult = LoginRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return HttpResponse.json(createTestErrorResponse('Invalid request'), {
        status: 400,
      });
    }

    const { usernameOrEmail, password } = parseResult.data;

    // Business logic
    if (
      (usernameOrEmail === 'alice' ||
        usernameOrEmail === 'alice@example.com') &&
      password === 'password123'
    ) {
      currentUser = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        username: 'alice',
        email: 'alice@example.com',
      };

      // ✅ Response MUST match schema - BREAKS if contract changes
      const response = createTestLoginResponse();
      return HttpResponse.json(response, { status: 200 });
    }

    // Error response validated
    return HttpResponse.json(
      createTestErrorResponse('Invalid credentials', 'INVALID_CREDENTIALS'),
      {
        status: 401,
      },
    );
  }),

  /**
   * POST /auth/logout
   * ✅ Validates auth and clears session
   */
  http.post('http://localhost:3000/auth/logout', ({ request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !currentUser) {
      return HttpResponse.json(
        createTestErrorResponse('Unauthorized', 'INVALID_TOKEN'),
        {
          status: 401,
        },
      );
    }

    currentUser = null;
    return new HttpResponse(null, { status: 204 });
  }),

  /**
   * POST /todos
   * ✅ Validates request body with CreateTodoRequestSchema
   * ✅ Validates response with TodoResponseSchema
   */
  http.post('http://localhost:3000/todos', async ({ request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !currentUser) {
      return HttpResponse.json(
        createTestErrorResponse('Unauthorized', 'INVALID_TOKEN'),
        {
          status: 401,
        },
      );
    }

    const body = await request.json();

    // ✅ Validate request - BREAKS if CreateTodoRequestSchema changes
    const parseResult = CreateTodoRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return HttpResponse.json(
        createTestErrorResponse('Invalid request body', 'UNEXPECTED_ERROR'),
        { status: 500 },
      );
    }

    const { title, description } = parseResult.data;

    // ✅ Response validated by factory - BREAKS if TodoResponseSchema changes
    const newTodo = createTestTodo({
      id: `todo-${Date.now()}`,
      userId: currentUser.id,
      title,
      description,
    });

    todos.set(newTodo.id, newTodo);
    return HttpResponse.json(newTodo, { status: 201 });
  }),

  /**
   * GET /todos
   * ✅ Validates response array with TodoResponseSchema
   */
  http.get('http://localhost:3000/todos', ({ request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || authHeader === 'Bearer ') {
      return HttpResponse.json(
        createTestErrorResponse('Unauthorized', 'INVALID_TOKEN'),
        {
          status: 401,
        },
      );
    }

    // If we have a currentUser (from login), filter by that
    // Otherwise, assume the token is valid and use default test user ID
    const userId = currentUser?.id || '550e8400-e29b-41d4-a716-446655440000';

    // Filter todos by user
    const userTodos = Array.from(todos.values()).filter(
      (todo) => todo.userId === userId,
    );

    // ✅ Each todo already validated by factory
    return HttpResponse.json(userTodos, { status: 200 });
  }),

  /**
   * GET /todos/:id
   * ✅ Validates response with TodoResponseSchema
   */
  http.get('http://localhost:3000/todos/:id', ({ request, params }) => {
    const authHeader = request.headers.get('Authorization');
    const { id } = params;

    if (!authHeader || !currentUser) {
      return HttpResponse.json(
        createTestErrorResponse('Unauthorized', 'INVALID_TOKEN'),
        {
          status: 401,
        },
      );
    }

    const todo = todos.get(id as string);

    if (!todo) {
      return HttpResponse.json(
        createTestErrorResponse('Todo not found', 'TODO_NOT_FOUND'),
        {
          status: 404,
        },
      );
    }

    if (todo.userId !== currentUser.id) {
      return HttpResponse.json(
        createTestErrorResponse('Forbidden', 'UNAUTHORIZED_ACCESS'),
        {
          status: 403,
        },
      );
    }

    return HttpResponse.json(todo, { status: 200 });
  }),

  /**
   * PATCH /todos/:id/complete
   * ✅ Validates response with TodoResponseSchema
   */
  http.patch(
    'http://localhost:3000/todos/:id/complete',
    ({ request, params }) => {
      const authHeader = request.headers.get('Authorization');
      const { id } = params;

      if (!authHeader || !currentUser) {
        return HttpResponse.json(
          createTestErrorResponse('Unauthorized', 'INVALID_TOKEN'),
          {
            status: 401,
          },
        );
      }

      const todo = todos.get(id as string);

      if (!todo) {
        return HttpResponse.json(
          createTestErrorResponse('Todo not found', 'TODO_NOT_FOUND'),
          {
            status: 404,
          },
        );
      }

      if (todo.userId !== currentUser.id) {
        return HttpResponse.json(
          createTestErrorResponse('Forbidden', 'UNAUTHORIZED_ACCESS'),
          {
            status: 403,
          },
        );
      }

      if (todo.completed) {
        return HttpResponse.json(
          createTestErrorResponse(
            'Todo already completed',
            'TODO_ALREADY_COMPLETED',
          ),
          { status: 400 },
        );
      }

      // ✅ Updated todo validated by factory
      const updatedTodo = createTestTodo({
        ...todo,
        completed: true,
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      todos.set(id as string, updatedTodo);
      return HttpResponse.json(updatedTodo, { status: 200 });
    },
  ),
];

/**
 * Reset state between tests
 */
export const resetMockState = () => {
  currentUser = null;
  todos.clear();
};

/**
 * Add todos to the mock state for testing
 */
export const addMockTodos = (
  todosToAdd: ReturnType<typeof createTestTodo>[],
) => {
  todosToAdd.forEach((todo) => {
    todos.set(todo.id, todo);
  });
};
