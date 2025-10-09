import { initServer } from '@ts-rest/express';
import { todoContract, type TodoResponse } from '@demo-todo/api-contracts';
import type { TodoService } from '../domain/todo-service.js';
import type { Todo } from '../domain/todo-schemas.js';
import {
  requirePermissions,
  extractAuthAndOrgContext,
  requireCreatorOrPermission,
} from '../../auth/index.js';
import { logServiceCall } from '../../observability/index.js';

const s = initServer();

// Helper to convert domain Todo to API response
const toTodoResponse = (todo: Todo): TodoResponse => ({
  id: todo.id,
  organizationId: todo.organizationId,
  createdBy: todo.createdBy,
  title: todo.title,
  description: todo.description,
  completed: todo.completed,
  createdAt: todo.createdAt.toISOString(),
  updatedAt: todo.updatedAt.toISOString(),
  completedAt: todo.completedAt?.toISOString(),
});

// Factory to create todo router with dependencies
export const createTodoRouter = (todoService: TodoService) => {
  return s.router(todoContract, {
    createTodo: {
      middleware: [requirePermissions('todos:create')],
      handler: async ({ body, req }) => {
        const contextResult = extractAuthAndOrgContext(req);
        if (contextResult.isErr()) {
          return {
            status: 401,
            body: { message: 'Unauthorized', code: 'INVALID_TOKEN' },
          };
        }

        const { user, orgContext } = contextResult.value;

        const result = await logServiceCall(
          'createTodo',
          () =>
            todoService.createTodo({
              organizationId: orgContext.organizationId,
              createdBy: user.id,
              title: body.title,
              description: body.description,
            }),
          {
            userId: user.id,
            organizationId: orgContext.organizationId,
          },
        );

        if (result.isErr()) {
          return {
            status: 500,
            body: {
              message: 'Internal server error',
              code: 'UNEXPECTED_ERROR',
            },
          };
        }

        return {
          status: 201,
          body: toTodoResponse(result.value),
        };
      },
    },

    listTodos: {
      middleware: [requirePermissions('todos:read')],
      handler: async ({ req }) => {
        const contextResult = extractAuthAndOrgContext(req);
        if (contextResult.isErr()) {
          return {
            status: 401,
            body: { message: 'Unauthorized', code: 'INVALID_TOKEN' },
          };
        }

        const { user, orgContext } = contextResult.value;

        const result = await logServiceCall(
          'listTodos',
          () => todoService.listTodos(orgContext.organizationId),
          {
            userId: user.id,
            organizationId: orgContext.organizationId,
          },
        );

        if (result.isErr()) {
          return {
            status: 500,
            body: {
              message: 'Internal server error',
              code: 'UNEXPECTED_ERROR',
            },
          };
        }

        return {
          status: 200,
          body: result.value.map(toTodoResponse),
        };
      },
    },

    getTodoById: {
      middleware: [requirePermissions('todos:read')],
      handler: async ({ params }) => {
        const result = await todoService.getTodoById(params.id);

        if (result.isErr()) {
          const error = result.error;
          switch (error.code) {
            case 'INVALID_TODO_ID':
              return {
                status: 400,
                body: {
                  message: 'Invalid todo ID format',
                  code: 'INVALID_TODO_ID',
                },
              };
            case 'TODO_NOT_FOUND':
              return {
                status: 404,
                body: { message: 'Todo not found', code: 'TODO_NOT_FOUND' },
              };
            case 'UNEXPECTED_ERROR':
              return {
                status: 500,
                body: {
                  message: 'Internal server error',
                  code: 'UNEXPECTED_ERROR',
                },
              };
          }
        }

        return {
          status: 200,
          body: toTodoResponse(result.value),
        };
      },
    },

    completeTodo: {
      // NO middleware - resource-specific check needed in handler
      handler: async ({ params, req }) => {
        const contextResult = extractAuthAndOrgContext(req);
        if (contextResult.isErr()) {
          return {
            status: 401,
            body: { message: 'Unauthorized', code: 'INVALID_TOKEN' },
          };
        }

        const { orgContext } = contextResult.value;

        // Fetch resource first
        const todoResult = await todoService.getTodoById(params.id);

        if (todoResult.isErr()) {
          const error = todoResult.error;
          switch (error.code) {
            case 'INVALID_TODO_ID':
              return {
                status: 400,
                body: {
                  message: 'Invalid todo ID format',
                  code: 'INVALID_TODO_ID',
                },
              };
            case 'TODO_NOT_FOUND':
              return {
                status: 404,
                body: { message: 'Todo not found', code: 'TODO_NOT_FOUND' },
              };
            case 'UNEXPECTED_ERROR':
              return {
                status: 500,
                body: {
                  message: 'Internal server error',
                  code: 'UNEXPECTED_ERROR',
                },
              };
          }
        }

        const todo = todoResult.value;

        // Resource-specific authorization: user is creator OR has todos:complete permission
        const authResult = requireCreatorOrPermission('todos:complete')(
          orgContext,
          { createdBy: todo.createdBy },
        );

        if (authResult.isErr()) {
          return {
            status: 403,
            body: { message: 'Forbidden', code: 'UNAUTHORIZED_ACCESS' },
          };
        }

        // Call domain service to complete
        const result = await todoService.completeTodo(params.id);

        if (result.isErr()) {
          const error = result.error;
          switch (error.code) {
            case 'TODO_ALREADY_COMPLETED':
              return {
                status: 400,
                body: {
                  message: 'Todo already completed',
                  code: 'TODO_ALREADY_COMPLETED',
                },
              };
            case 'UNEXPECTED_ERROR':
              return {
                status: 500,
                body: {
                  message: 'Internal server error',
                  code: 'UNEXPECTED_ERROR',
                },
              };
            default:
              return {
                status: 500,
                body: {
                  message: 'Internal server error',
                  code: 'UNEXPECTED_ERROR',
                },
              };
          }
        }

        return {
          status: 200,
          body: toTodoResponse(result.value),
        };
      },
    },

    deleteTodo: {
      middleware: [requirePermissions('todos:delete')],
      handler: async ({ params }) => {
        const result = await todoService.deleteTodo(params.id);

        if (result.isErr()) {
          const error = result.error;
          switch (error.code) {
            case 'INVALID_TODO_ID':
              return {
                status: 404,
                body: { message: 'Todo not found', code: 'TODO_NOT_FOUND' },
              };
            case 'TODO_NOT_FOUND':
              return {
                status: 404,
                body: { message: 'Todo not found', code: 'TODO_NOT_FOUND' },
              };
            case 'UNEXPECTED_ERROR':
              return {
                status: 500,
                body: {
                  message: 'Internal server error',
                  code: 'UNEXPECTED_ERROR',
                },
              };
          }
        }

        return {
          status: 204,
          body: undefined,
        };
      },
    },
  });
};
