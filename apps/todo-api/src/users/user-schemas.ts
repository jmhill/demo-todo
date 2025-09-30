import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string().min(3).max(50),
  passwordHash: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

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

export const UserWithoutPasswordSchema = UserSchema.omit({
  passwordHash: true,
});
export type UserWithoutPassword = z.infer<typeof UserWithoutPasswordSchema>;

export const formatZodError = (error: z.ZodError): string => {
  return error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join(', ');
};
