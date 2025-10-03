import { z } from 'zod';

// Login request
export const LoginRequestSchema = z.object({
  usernameOrEmail: z.string().min(1),
  password: z.string().min(1),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

// Login response
export const LoginResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    username: z.string(),
  }),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

// Token payload (what we store in JWT)
export const TokenPayloadSchema = z.object({
  userId: z.string().uuid(),
});

export type TokenPayload = z.infer<typeof TokenPayloadSchema>;
