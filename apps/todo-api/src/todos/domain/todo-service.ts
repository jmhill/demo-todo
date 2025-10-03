import { ResultAsync, errAsync, okAsync } from 'neverthrow';
import type { Clock, IdGenerator } from '@demo-todo/infrastructure';
import { type Todo, type CreateTodoCommand } from './todo-schemas.js';
import {
  type TodoError,
  todoNotFound,
  invalidTodoId,
  todoAlreadyCompleted,
  unauthorizedAccess,
  unexpectedError,
} from './todo-errors.js';

// Domain-owned port - infrastructure implements this
export interface TodoStore {
  save(todo: Todo): Promise<void>;
  findById(id: string): Promise<Todo | null>;
  findByUserId(userId: string): Promise<Todo[]>;
  update(todo: Todo): Promise<void>;
}

export interface TodoService {
  createTodo(command: CreateTodoCommand): ResultAsync<Todo, TodoError>;
  listTodos(userId: string): ResultAsync<Todo[], TodoError>;
  getTodoById(options: {
    todoId: string;
    userId: string;
  }): ResultAsync<Todo, TodoError>;
  completeTodo(options: {
    todoId: string;
    userId: string;
  }): ResultAsync<Todo, TodoError>;
}

export function createTodoService(
  todoStore: TodoStore,
  idGenerator: IdGenerator,
  clock: Clock,
): TodoService {
  return {
    createTodo(command: CreateTodoCommand): ResultAsync<Todo, TodoError> {
      const now = clock.now();
      const todo: Todo = {
        id: idGenerator.generate(),
        userId: command.userId,
        title: command.title,
        description: command.description,
        completed: false,
        createdAt: now,
        updatedAt: now,
      };

      return ResultAsync.fromPromise(todoStore.save(todo), (error) =>
        unexpectedError('Database error saving todo', error),
      ).map(() => todo);
    },

    listTodos(userId: string): ResultAsync<Todo[], TodoError> {
      return ResultAsync.fromPromise(todoStore.findByUserId(userId), (error) =>
        unexpectedError('Database error fetching todos', error),
      );
    },

    getTodoById(options: {
      todoId: string;
      userId: string;
    }): ResultAsync<Todo, TodoError> {
      const { todoId, userId } = options;

      // Validate ID format first
      if (!idGenerator.validate(todoId)) {
        return errAsync(invalidTodoId(todoId));
      }

      return ResultAsync.fromPromise(todoStore.findById(todoId), (error) =>
        unexpectedError('Database error fetching todo by ID', error),
      ).andThen((todo) => {
        if (!todo) {
          return errAsync(todoNotFound(todoId));
        }
        // Check if the todo belongs to the user
        if (todo.userId !== userId) {
          return errAsync(unauthorizedAccess(todoId, userId));
        }
        return okAsync(todo);
      });
    },

    completeTodo(options: {
      todoId: string;
      userId: string;
    }): ResultAsync<Todo, TodoError> {
      const { todoId, userId } = options;

      // Validate ID format first
      if (!idGenerator.validate(todoId)) {
        return errAsync(invalidTodoId(todoId));
      }

      return ResultAsync.fromPromise(todoStore.findById(todoId), (error) =>
        unexpectedError('Database error fetching todo', error),
      )
        .andThen((todo) => {
          if (!todo) {
            return errAsync(todoNotFound(todoId));
          }
          // Check if the todo belongs to the user
          if (todo.userId !== userId) {
            return errAsync(unauthorizedAccess(todoId, userId));
          }
          return okAsync(todo);
        })
        .andThen((todo) => {
          if (todo.completed) {
            return errAsync(todoAlreadyCompleted(todoId));
          }

          const now = clock.now();
          const updatedTodo: Todo = {
            ...todo,
            completed: true,
            completedAt: now,
            updatedAt: now,
          };

          return ResultAsync.fromPromise(
            todoStore.update(updatedTodo),
            (error) => unexpectedError('Database error updating todo', error),
          ).map(() => updatedTodo);
        });
    },
  };
}
