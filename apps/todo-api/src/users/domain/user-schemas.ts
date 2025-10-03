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

// Domain command - used by UserService
export const CreateUserCommandSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(8),
});

export type CreateUserCommand = z.infer<typeof CreateUserCommandSchema>;
