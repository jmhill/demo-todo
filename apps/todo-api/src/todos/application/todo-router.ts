import { initServer } from '@ts-rest/express';
import { todoContract, type TodoResponse } from '@demo-todo/api-contracts';
import type { TodoService } from '../domain/todo-service.js';
import type { Todo } from '../domain/todo-schemas.js';

const s = initServer();

// Helper to convert domain Todo to API response
const toTodoResponse = (todo: Todo): TodoResponse => ({
  id: todo.id,
  userId: todo.userId,
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
    createTodo: async ({ body, req }) => {
      // req.auth is set in our global middleware on successful authentication,
      // and therefore must exist here.
      // Exploring better ways to injext this context into ts-rest
      const userId = req.auth!.user.id;

      const result = await todoService.createTodo({
        userId,
        title: body.title,
        description: body.description,
      });

      if (result.isErr()) {
        // createTodo can only return UNEXPECTED_ERROR
        return {
          status: 500,
          body: { message: 'Internal server error', code: 'UNEXPECTED_ERROR' },
        };
      }

      return {
        status: 201,
        body: toTodoResponse(result.value),
      };
    },

    listTodos: async ({ req }) => {
      const userId = req.auth!.user.id;

      const result = await todoService.listTodos(userId);

      if (result.isErr()) {
        // listTodos can only return UNEXPECTED_ERROR
        return {
          status: 500,
          body: { message: 'Internal server error', code: 'UNEXPECTED_ERROR' },
        };
      }

      return {
        status: 200,
        body: result.value.map(toTodoResponse),
      };
    },

    getTodoById: async ({ params, req }) => {
      const userId = req.auth!.user.id;

      const result = await todoService.getTodoById({
        todoId: params.id,
        userId,
      });

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
          case 'UNAUTHORIZED_ACCESS':
            return {
              status: 403,
              body: {
                message: 'Unauthorized access',
                code: 'UNAUTHORIZED_ACCESS',
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
        }
      }

      return {
        status: 200,
        body: toTodoResponse(result.value),
      };
    },

    completeTodo: async ({ params, req }) => {
      const userId = req.auth!.user.id;

      const result = await todoService.completeTodo({
        todoId: params.id,
        userId,
      });

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
          case 'UNAUTHORIZED_ACCESS':
            return {
              status: 403,
              body: {
                message: 'Unauthorized access',
                code: 'UNAUTHORIZED_ACCESS',
              },
            };
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
        }
      }

      return {
        status: 200,
        body: toTodoResponse(result.value),
      };
    },
  });
};
