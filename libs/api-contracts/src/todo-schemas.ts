import { z } from 'zod';

// Request schemas
export const CreateTodoRequestSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
});

export type CreateTodoRequest = z.infer<typeof CreateTodoRequestSchema>;

export const UpdateTodoRequestSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
});

export type UpdateTodoRequest = z.infer<typeof UpdateTodoRequestSchema>;

// Response schemas - Dates transformed to ISO strings
export const TodoResponseSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  createdBy: z.string().uuid(),
  title: z.string(),
  description: z.string().optional(),
  completed: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().optional(),
});

export type TodoResponse = z.infer<typeof TodoResponseSchema>;
