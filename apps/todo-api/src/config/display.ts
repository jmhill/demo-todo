import { loadConfig } from './index.js';
import { configSchema } from './schema.js';
import type { GetSecretFn } from './secrets.js';
import { getSecret, secretSchema } from './secrets.js';
import { z } from 'zod';

// Extract secret paths from the schema automatically
export const getSecretPaths = (
  schema: z.ZodTypeAny,
  path: string[] = [],
): string[] => {
  const paths: string[] = [];

  if (schema instanceof z.ZodObject) {
    for (const [key, fieldSchema] of Object.entries(schema.shape)) {
      const currentPath = [...path, key];

      // Check if this field uses secretSchema directly
      if (fieldSchema === secretSchema) {
        paths.push(currentPath.join('.'));
      }
      // Recursively check nested objects
      else if (fieldSchema instanceof z.ZodObject) {
        paths.push(...getSecretPaths(fieldSchema, currentPath));
      }
    }
  }

  return paths;
};

// Automatically detect secret paths from the schema
const secretPaths = getSecretPaths(configSchema);

const isSecretPath = (path: string[]): boolean => {
  // Check if the full path or any suffix matches a secret path
  // This allows secrets to be nested at any level
  for (let i = 0; i < path.length; i++) {
    const suffix = path.slice(i).join('.');
    if (secretPaths.includes(suffix)) {
      return true;
    }
  }
  return false;
};

export const filterSecrets = <T>(config: T, path: string[] = []): T => {
  if (config === null || config === undefined) {
    return config;
  }

  if (Array.isArray(config)) {
    return config.map((item) => filterSecrets(item, path)) as T;
  }

  if (typeof config === 'object') {
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(config)) {
      const currentPath = [...path, key];

      if (isSecretPath(currentPath)) {
        filtered[key] = '[HIDDEN]';
      } else if (value !== null && typeof value === 'object') {
        filtered[key] = filterSecrets(value, currentPath);
      } else {
        filtered[key] = value;
      }
    }
    return filtered as T;
  }

  return config;
};

export const printEffectiveConfig = (
  environment?: string,
  getSecretFn: GetSecretFn = getSecret,
): string => {
  const env = environment || process.env.NODE_ENV || 'development';

  const config = loadConfig(env, getSecretFn);
  const filteredConfig = filterSecrets(config);

  return JSON.stringify(filteredConfig, null, 2);
};
