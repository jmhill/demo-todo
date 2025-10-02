import { z } from 'zod';

// Core domain user type - never includes password
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string().min(3).max(50),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

// Persistence model - includes hashed password, only used for store.save()
export const UserWithHashedPasswordSchema = UserSchema.extend({
  passwordHash: z.string(),
});

export type UserWithHashedPassword = z.infer<
  typeof UserWithHashedPasswordSchema
>;

export const CreateUserDtoSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(8),
});

export type CreateUserDto = z.infer<typeof CreateUserDtoSchema>;

export const CreateUserCommandSchema = CreateUserDtoSchema.transform((dto) => ({
  email: dto.email,
  username: dto.username,
  password: dto.password,
}));

export type CreateUserCommand = z.infer<typeof CreateUserCommandSchema>;

// Response DTO for User over HTTP - transforms Date objects to ISO strings
export const UserResponseDtoSchema = UserSchema.transform((user) => ({
  id: user.id,
  email: user.email,
  username: user.username,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString(),
}));

export type UserResponseDto = z.infer<typeof UserResponseDtoSchema>;

export const formatZodError = (error: z.ZodError): string => {
  return error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join(', ');
};
