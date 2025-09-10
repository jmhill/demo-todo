import { z } from 'zod';

// Schema for rate limiting configuration
const rateLimitingSchema = z.object({
  enabled: z.boolean().default(true),
  windowMs: z.number().positive().default(900000), // 15 minutes (matches default.json)
  max: z.number().positive().default(100), // requests per window
});

// Schema for CORS configuration
const corsSchema = z.object({
  enabled: z.boolean().default(true),
  origins: z.array(z.string()).default(['http://localhost:3001']),
});

// Schema for request limits configuration
const requestLimitsSchema = z.object({
  enabled: z.boolean().default(true),
  jsonLimit: z.string().default('1mb'),
  urlencodedLimit: z.string().default('1mb'),
});

// Schema for secure headers configuration
const secureHeadersSchema = z.object({
  enabled: z.boolean().default(true),
});

// Schema for server configuration
const serverSchema = z.object({
  port: z.number().positive().default(3000),
  host: z.string().default('localhost'),
});

// Main application configuration schema
export const configSchema = z.object({
  environment: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  server: serverSchema,
  security: z.object({
    cors: corsSchema,
    rateLimiting: rateLimitingSchema,
    requestLimits: requestLimitsSchema,
    secureHeaders: secureHeadersSchema,
  }),
  testSecret: z.string().optional(),
});

// Type inference from schema
export type AppConfig = z.infer<typeof configSchema>;
export type RateLimitingConfig = z.infer<typeof rateLimitingSchema>;
export type CorsConfig = z.infer<typeof corsSchema>;
export type RequestLimitsConfig = z.infer<typeof requestLimitsSchema>;
export type SecureHeadersConfig = z.infer<typeof secureHeadersSchema>;
export type ServerConfig = z.infer<typeof serverSchema>;
