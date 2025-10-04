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

// Schema for Content Security Policy directives
const cspDirectivesSchema = z.object({
  defaultSrc: z.array(z.string()).optional(),
  scriptSrc: z.array(z.string()).optional(),
  styleSrc: z.array(z.string()).optional(),
  imgSrc: z.array(z.string()).optional(),
  connectSrc: z.array(z.string()).optional(),
  fontSrc: z.array(z.string()).optional(),
  objectSrc: z.array(z.string()).optional(),
  mediaSrc: z.array(z.string()).optional(),
  frameSrc: z.array(z.string()).optional(),
});

// Schema for secure headers configuration
const secureHeadersSchema = z.object({
  enabled: z.boolean(),
  contentSecurityPolicy: z
    .object({
      directives: cspDirectivesSchema.optional(),
    })
    .optional(),
});

// Schema for server configuration
const serverSchema = z.object({
  port: z.number().positive(),
  host: z.string(),
});

// Schema for database configuration
const databaseSchema = z.object({
  host: z.string(),
  port: z.number().positive(),
  user: z.string(),
  password: secretSchema,
  database: z.string(),
});

// Schema for auth configuration
const authSchema = z.object({
  jwtSecret: secretSchema,
  jwtExpiresIn: z.string(),
});

const docsSchema = z.object({
  enabled: z.boolean(),
})

// Main application configuration schema
export const configSchema = z.object({
  environment: z.enum(['development', 'test', 'production']),
  server: serverSchema,
  database: databaseSchema,
  auth: authSchema,
  security: z.object({
    cors: corsSchema,
    rateLimiting: rateLimitingSchema,
    requestLimits: requestLimitsSchema,
    secureHeaders: secureHeadersSchema,
  }),
  docSite: docsSchema
});

// Type inference from schema
export type AppConfig = z.infer<typeof configSchema>;
export type RateLimitingConfig = z.infer<typeof rateLimitingSchema>;
export type CorsConfig = z.infer<typeof corsSchema>;
export type RequestLimitsConfig = z.infer<typeof requestLimitsSchema>;
export type SecureHeadersConfig = z.infer<typeof secureHeadersSchema>;
export type ServerConfig = z.infer<typeof serverSchema>;
export type AuthConfig = z.infer<typeof authSchema>;
