import type { Todo } from './todo-schemas.js';
import type { TodoStore } from './todo-service.js';

export function createInMemoryTodoStore(): TodoStore {
  const todos = new Map<string, Todo>();
  const userIdIndex = new Map<string, Set<string>>();

  return {
    async save(todo: Todo): Promise<void> {
      todos.set(todo.id, todo);

      // Update user index
      if (!userIdIndex.has(todo.userId)) {
        userIdIndex.set(todo.userId, new Set());
      }
      userIdIndex.get(todo.userId)?.add(todo.id);
    },

    async findById(id: string): Promise<Todo | null> {
      return todos.get(id) ?? null;
    },

    async findByUserId(userId: string): Promise<Todo[]> {
      const todoIds = userIdIndex.get(userId);
      if (!todoIds) return [];

      const userTodos: Todo[] = [];
      for (const todoId of todoIds) {
        const todo = todos.get(todoId);
        if (todo) {
          userTodos.push(todo);
        }
      }
      return userTodos;
    },

    async update(todo: Todo): Promise<void> {
      todos.set(todo.id, todo);
    },
  };
}
