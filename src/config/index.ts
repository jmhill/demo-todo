import { readFileSync } from 'fs';
import { join } from 'path';
import { configSchema, type AppConfig } from './schema.js';

const loadJsonFile = (path: string): unknown => {
  try {
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content);
  } catch {
    // File might not exist, which is okay for environment-specific configs
    return {};
  }
};

type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
type JsonObject = { [Key in string]?: JsonValue };
type JsonArray = JsonValue[];

const mergeDeep = (target: JsonObject, source: JsonObject): JsonObject => {
  const output = { ...target };

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = mergeDeep(
            target[key] as JsonObject,
            source[key] as JsonObject,
          );
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }

  return output;
};

const isObject = (item: unknown): item is JsonObject => {
  return item !== null && typeof item === 'object' && !Array.isArray(item);
};

export const loadConfig = (environment?: string): AppConfig => {
  const env = environment || process.env.NODE_ENV || 'development';
  const configDir = join(process.cwd(), 'config');

  // Minimal base configuration that will pass validation with defaults
  const baseConfig: JsonObject = {
    server: {},
    security: {
      cors: {},
      rateLimiting: {},
      requestLimits: {},
      secureHeaders: {},
    },
  };

  // Load default configuration
  const defaultConfig = loadJsonFile(
    join(configDir, 'default.json'),
  ) as JsonObject;

  // Load environment-specific configuration
  const envConfig = loadJsonFile(join(configDir, `${env}.json`)) as JsonObject;

  // Merge configurations (later configs override earlier ones)
  let mergedConfig = mergeDeep(baseConfig, defaultConfig);
  mergedConfig = mergeDeep(mergedConfig, envConfig);

  // Validate and return typed configuration
  const result = configSchema.safeParse(mergedConfig);

  if (!result.success) {
    console.error('Configuration validation failed:', result.error.format());
    throw new Error(`Invalid configuration: ${result.error.message}`);
  }

  return result.data;
};

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Export a function to create custom configurations for testing
export const createTestConfig = (
  overrides: DeepPartial<AppConfig> = {},
): AppConfig => {
  // Create a test-specific base configuration with high rate limits
  const testBaseConfig: JsonObject = {
    environment: 'test',
    server: {
      port: 3000,
      host: 'localhost',
    },
    security: {
      cors: {
        enabled: true,
        origins: ['http://localhost:3001'],
      },
      rateLimiting: {
        enabled: true,
        windowMs: 60000, // 1 minute
        max: 10000, // High limit for testing
      },
      requestLimits: {
        enabled: true,
        jsonLimit: '1mb',
        urlencodedLimit: '1mb',
      },
      secureHeaders: {
        enabled: true,
      },
    },
  };

  const mergedConfig = mergeDeep(testBaseConfig, overrides as JsonObject);

  const result = configSchema.safeParse(mergedConfig);

  if (!result.success) {
    throw new Error(`Invalid test configuration: ${result.error.message}`);
  }

  return result.data;
};
