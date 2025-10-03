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

// Domain command - used by TodoService
export const CreateTodoCommandSchema = z.object({
  userId: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
});

export type CreateTodoCommand = z.infer<typeof CreateTodoCommandSchema>;

export const UpdateTodoCommandSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
});

export type UpdateTodoCommand = z.infer<typeof UpdateTodoCommandSchema>;
