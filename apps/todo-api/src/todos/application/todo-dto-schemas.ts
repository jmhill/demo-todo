import { z } from 'zod';
import { TodoSchema } from '../domain/todo-schemas.js';

// HTTP Request DTOs
export const CreateTodoDtoSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
});

export type CreateTodoDto = z.infer<typeof CreateTodoDtoSchema>;

export const UpdateTodoDtoSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
});

export type UpdateTodoDto = z.infer<typeof UpdateTodoDtoSchema>;

// HTTP Response DTO - transforms Date objects to ISO strings
export const TodoResponseDtoSchema = TodoSchema.transform((todo) => ({
  id: todo.id,
  userId: todo.userId,
  title: todo.title,
  description: todo.description,
  completed: todo.completed,
  createdAt: todo.createdAt.toISOString(),
  updatedAt: todo.updatedAt.toISOString(),
  completedAt: todo.completedAt?.toISOString(),
}));

export type TodoResponseDto = z.infer<typeof TodoResponseDtoSchema>;
