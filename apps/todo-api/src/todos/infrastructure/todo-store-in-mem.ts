import type { Todo } from '../domain/todo-schemas.js';
import type { TodoStore } from '../domain/todo-service.js';

export function createInMemoryTodoStore(): TodoStore {
  const todos = new Map<string, Todo>();
  const organizationIdIndex = new Map<string, Set<string>>();

  return {
    async save(todo: Todo): Promise<void> {
      todos.set(todo.id, todo);

      // Update organization index
      if (!organizationIdIndex.has(todo.organizationId)) {
        organizationIdIndex.set(todo.organizationId, new Set());
      }
      organizationIdIndex.get(todo.organizationId)?.add(todo.id);
    },

    async findById(id: string): Promise<Todo | null> {
      return todos.get(id) ?? null;
    },

    async findByOrganizationId(organizationId: string): Promise<Todo[]> {
      const todoIds = organizationIdIndex.get(organizationId);
      if (!todoIds) return [];

      const orgTodos: Todo[] = [];
      for (const todoId of todoIds) {
        const todo = todos.get(todoId);
        if (todo) {
          orgTodos.push(todo);
        }
      }
      return orgTodos;
    },

    async update(todo: Todo): Promise<void> {
      todos.set(todo.id, todo);
    },
  };
}
