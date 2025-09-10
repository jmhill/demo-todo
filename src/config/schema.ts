import { z } from 'zod';
import { secretSchema } from './secrets.js';

// Schema for rate limiting configuration
const rateLimitingSchema = z.object({
  enabled: z.boolean(),
  windowMs: z.number().positive(),
  max: z.number().positive(),
});

// Schema for CORS configuration
const corsSchema = z.object({
  enabled: z.boolean(),
  origins: z.array(z.string()),
});

// Schema for request limits configuration
const requestLimitsSchema = z.object({
  enabled: z.boolean(),
  jsonLimit: z.string(),
  urlencodedLimit: z.string(),
});

// Schema for secure headers configuration
const secureHeadersSchema = z.object({
  enabled: z.boolean(),
});

// Schema for server configuration
const serverSchema = z.object({
  port: z.number().positive(),
  host: z.string(),
});

// Main application configuration schema
export const configSchema = z.object({
  environment: z.enum(['development', 'test', 'production']),
  server: serverSchema,
  security: z.object({
    cors: corsSchema,
    rateLimiting: rateLimitingSchema,
    requestLimits: requestLimitsSchema,
    secureHeaders: secureHeadersSchema,
  }),
  /**
   * Test secret for demonstration purposes.
   * SECURITY: Must be loaded via getSecret() from environment variables.
   * Never hardcode secrets in configuration files.
   */
  testSecret: secretSchema,
});

// Type inference from schema
export type AppConfig = z.infer<typeof configSchema>;
export type RateLimitingConfig = z.infer<typeof rateLimitingSchema>;
export type CorsConfig = z.infer<typeof corsSchema>;
export type RequestLimitsConfig = z.infer<typeof requestLimitsSchema>;
export type SecureHeadersConfig = z.infer<typeof secureHeadersSchema>;
export type ServerConfig = z.infer<typeof serverSchema>;
