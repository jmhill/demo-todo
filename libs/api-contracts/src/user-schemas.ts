import { z } from 'zod';

// Request schemas
export const CreateUserRequestSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(8),
});

export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;

// Response schemas - Dates transformed to ISO strings
export const UserResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type UserResponse = z.infer<typeof UserResponseSchema>;
