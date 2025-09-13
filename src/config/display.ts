import { loadConfig } from './index.js';
import type { GetSecretFn } from './secrets.js';
import { getSecret } from './secrets.js';

const secretFields = new Set<string>(['testSecret']);

const isSecretField = (key: string): boolean => {
  return secretFields.has(key);
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
      const fieldName = currentPath[currentPath.length - 1];

      if (fieldName && isSecretField(fieldName)) {
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
