import { z } from 'zod';
import { UserSchema } from '../domain/user-schemas.js';

// HTTP Request DTOs
export const CreateUserDtoSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(8),
});

export type CreateUserDto = z.infer<typeof CreateUserDtoSchema>;

// HTTP Response DTO - transforms Date objects to ISO strings
export const UserResponseDtoSchema = UserSchema.transform((user) => ({
  id: user.id,
  email: user.email,
  username: user.username,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString(),
}));

export type UserResponseDto = z.infer<typeof UserResponseDtoSchema>;

// Utility for formatting Zod validation errors
export const formatZodError = (error: z.ZodError): string => {
  return error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join(', ');
};
