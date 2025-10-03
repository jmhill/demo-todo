import { initServer } from '@ts-rest/express';
import { todoContract } from '@demo-todo/api-contracts';
import type { TodoService } from '../domain/todo-service.js';

const s = initServer();

// Factory to create todo router with dependencies
export const createTodoRouter = (todoService: TodoService) => {
  return s.router(todoContract, {
    createTodo: async ({ body, req }) => {
      const userId = req.auth!.user.id;

      const result = await todoService.createTodo({
        userId,
        title: body.title,
        description: body.description,
      });

      return result.match(
        (todo) => ({
          status: 201,
          body: {
            id: todo.id,
            userId: todo.userId,
            title: todo.title,
            description: todo.description,
            completed: todo.completed,
            createdAt: todo.createdAt.toISOString(),
            updatedAt: todo.updatedAt.toISOString(),
            completedAt: todo.completedAt?.toISOString(),
          },
        }),
        (error) => {
          // Map domain errors to HTTP status codes
          if (error.code === 'VALIDATION_ERROR') {
            return {
              status: 400,
              body: { message: error.message },
            };
          }
          return {
            status: 500,
            body: { message: 'Internal server error' },
          };
        },
      );
    },

    listTodos: async ({ req }) => {
      const userId = req.auth!.user.id;

      const result = await todoService.listTodos(userId);

      return result.match(
        (todos) => ({
          status: 200,
          body: todos.map((todo) => ({
            id: todo.id,
            userId: todo.userId,
            title: todo.title,
            description: todo.description,
            completed: todo.completed,
            createdAt: todo.createdAt.toISOString(),
            updatedAt: todo.updatedAt.toISOString(),
            completedAt: todo.completedAt?.toISOString(),
          })),
        }),
        () => ({
          status: 500,
          body: { message: 'Internal server error' },
        }),
      );
    },

    getTodoById: async ({ params, req }) => {
      const userId = req.auth!.user.id;

      const result = await todoService.getTodoById({
        todoId: params.id,
        userId,
      });

      return result.match(
        (todo) => ({
          status: 200,
          body: {
            id: todo.id,
            userId: todo.userId,
            title: todo.title,
            description: todo.description,
            completed: todo.completed,
            createdAt: todo.createdAt.toISOString(),
            updatedAt: todo.updatedAt.toISOString(),
            completedAt: todo.completedAt?.toISOString(),
          },
        }),
        (error) => {
          // Map domain errors to HTTP status codes
          if (error.code === 'TODO_NOT_FOUND') {
            return {
              status: 404,
              body: { message: 'Todo not found' },
            };
          }
          if (error.code === 'INVALID_TODO_ID') {
            return {
              status: 400,
              body: { message: 'Invalid todo ID format' },
            };
          }
          if (error.code === 'UNAUTHORIZED_ACCESS') {
            return {
              status: 403,
              body: { message: 'Unauthorized access' },
            };
          }
          return {
            status: 500,
            body: { message: 'Internal server error' },
          };
        },
      );
    },

    completeTodo: async ({ params, req }) => {
      const userId = req.auth!.user.id;

      const result = await todoService.completeTodo({
        todoId: params.id,
        userId,
      });

      return result.match(
        (todo) => ({
          status: 200,
          body: {
            id: todo.id,
            userId: todo.userId,
            title: todo.title,
            description: todo.description,
            completed: todo.completed,
            createdAt: todo.createdAt.toISOString(),
            updatedAt: todo.updatedAt.toISOString(),
            completedAt: todo.completedAt?.toISOString(),
          },
        }),
        (error) => {
          // Map domain errors to HTTP status codes
          if (error.code === 'TODO_NOT_FOUND') {
            return {
              status: 404,
              body: { message: 'Todo not found' },
            };
          }
          if (error.code === 'INVALID_TODO_ID') {
            return {
              status: 400,
              body: { message: 'Invalid todo ID format' },
            };
          }
          if (error.code === 'TODO_ALREADY_COMPLETED') {
            return {
              status: 400,
              body: { message: 'Todo already completed' },
            };
          }
          if (error.code === 'UNAUTHORIZED_ACCESS') {
            return {
              status: 403,
              body: { message: 'Unauthorized access' },
            };
          }
          return {
            status: 500,
            body: { message: 'Internal server error' },
          };
        },
      );
    },
  });
};
