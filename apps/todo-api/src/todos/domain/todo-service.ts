import { ResultAsync, errAsync, okAsync } from 'neverthrow';
import type { Clock, IdGenerator } from '@demo-todo/infrastructure';
import { type Todo, type CreateTodoCommand } from './todo-schemas.js';
import type {
  CreateTodoError,
  ListTodosError,
  GetTodoByIdError,
  CompleteTodoError,
} from './todo-errors.js';

// Domain-owned port - infrastructure implements this
export interface TodoStore {
  save(todo: Todo): Promise<void>;
  findById(id: string): Promise<Todo | null>;
  findByOrganizationId(organizationId: string): Promise<Todo[]>;
  update(todo: Todo): Promise<void>;
}

export interface TodoService {
  createTodo(command: CreateTodoCommand): ResultAsync<Todo, CreateTodoError>;
  listTodos(organizationId: string): ResultAsync<Todo[], ListTodosError>;
  getTodoById(todoId: string): ResultAsync<Todo, GetTodoByIdError>;
  completeTodo(todoId: string): ResultAsync<Todo, CompleteTodoError>;
}

export function createTodoService(
  todoStore: TodoStore,
  idGenerator: IdGenerator,
  clock: Clock,
): TodoService {
  return {
    createTodo(command: CreateTodoCommand): ResultAsync<Todo, CreateTodoError> {
      const now = clock.now();
      const todo: Todo = {
        id: idGenerator.generate(),
        organizationId: command.organizationId,
        createdBy: command.createdBy,
        title: command.title,
        description: command.description,
        completed: false,
        createdAt: now,
        updatedAt: now,
      };

      return ResultAsync.fromPromise(
        todoStore.save(todo),
        (error): CreateTodoError => ({
          code: 'UNEXPECTED_ERROR',
          message: 'Database error saving todo',
          cause: error,
        }),
      ).map(() => todo);
    },

    listTodos(organizationId: string): ResultAsync<Todo[], ListTodosError> {
      return ResultAsync.fromPromise(
        todoStore.findByOrganizationId(organizationId),
        (error): ListTodosError => ({
          code: 'UNEXPECTED_ERROR',
          message: 'Database error fetching todos',
          cause: error,
        }),
      );
    },

    getTodoById(todoId: string): ResultAsync<Todo, GetTodoByIdError> {
      // Validate ID format - domain responsibility for todo identity invariants
      if (!idGenerator.validate(todoId)) {
        return errAsync({ code: 'INVALID_TODO_ID', id: todoId } as const);
      }

      return ResultAsync.fromPromise(
        todoStore.findById(todoId),
        (error): GetTodoByIdError => ({
          code: 'UNEXPECTED_ERROR',
          message: 'Database error fetching todo by ID',
          cause: error,
        }),
      ).andThen((todo) => {
        if (!todo) {
          return errAsync({
            code: 'TODO_NOT_FOUND',
            identifier: todoId,
          } as const);
        }
        return okAsync(todo);
      });
    },

    completeTodo(todoId: string): ResultAsync<Todo, CompleteTodoError> {
      // Validate ID format - domain responsibility for todo identity invariants
      if (!idGenerator.validate(todoId)) {
        return errAsync({ code: 'INVALID_TODO_ID', id: todoId } as const);
      }

      return ResultAsync.fromPromise(
        todoStore.findById(todoId),
        (error): CompleteTodoError => ({
          code: 'UNEXPECTED_ERROR',
          message: 'Database error fetching todo',
          cause: error,
        }),
      )
        .andThen((todo) => {
          if (!todo) {
            return errAsync({
              code: 'TODO_NOT_FOUND',
              identifier: todoId,
            } as const);
          }
          return okAsync(todo);
        })
        .andThen((todo) => {
          if (todo.completed) {
            return errAsync({
              code: 'TODO_ALREADY_COMPLETED',
              todoId,
            } as const);
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
            (error): CompleteTodoError => ({
              code: 'UNEXPECTED_ERROR',
              message: 'Database error updating todo',
              cause: error,
            }),
          ).map(() => updatedTodo);
        });
    },
  };
}
