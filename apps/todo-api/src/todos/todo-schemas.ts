import { z } from 'zod';

// Core domain todo type
export const TodoSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  completed: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  completedAt: z.date().optional(),
});

export type Todo = z.infer<typeof TodoSchema>;

export const CreateTodoDtoSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
});

export type CreateTodoDto = z.infer<typeof CreateTodoDtoSchema>;

export const CreateTodoCommandSchema = CreateTodoDtoSchema.extend({
  userId: z.string().uuid(),
});

export type CreateTodoCommand = z.infer<typeof CreateTodoCommandSchema>;

export const UpdateTodoDtoSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
});

export type UpdateTodoDto = z.infer<typeof UpdateTodoDtoSchema>;

// Response DTO for Todo over HTTP - transforms Date objects to ISO strings
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
