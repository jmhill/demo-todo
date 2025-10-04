// Operation-specific error types
export type CreateTodoError = {
  code: 'UNEXPECTED_ERROR';
  message: string;
  cause?: unknown;
};

export type ListTodosError =
  | {
      code: 'UNEXPECTED_ERROR';
      message: string;
      cause?: unknown;
    }
  | { code: 'test error'; message: string };

export type GetTodoByIdError =
  | { code: 'INVALID_TODO_ID'; id: string }
  | { code: 'TODO_NOT_FOUND'; identifier: string }
  | { code: 'UNAUTHORIZED_ACCESS'; todoId: string; userId: string }
  | { code: 'UNEXPECTED_ERROR'; message: string; cause?: unknown };

export type CompleteTodoError =
  | { code: 'INVALID_TODO_ID'; id: string }
  | { code: 'TODO_NOT_FOUND'; identifier: string }
  | { code: 'UNAUTHORIZED_ACCESS'; todoId: string; userId: string }
  | { code: 'TODO_ALREADY_COMPLETED'; todoId: string }
  | { code: 'UNEXPECTED_ERROR'; message: string; cause?: unknown };
