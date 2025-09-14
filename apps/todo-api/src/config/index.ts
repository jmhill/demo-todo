import { deepmergeCustom } from 'deepmerge-ts';
import { configSchema, type AppConfig } from './schema.js';
import { getSecret, type GetSecretFn } from './secrets.js';
import { getConfig as getDefaultConfig } from '../../config/default.js';
import { getConfig as getTestConfig } from '../../config/test.js';
import { getConfig as getProductionConfig } from '../../config/production.js';

// Create custom deepmerge that replaces arrays instead of concatenating
const deepmerge = deepmergeCustom({
  mergeArrays: false, // Replace arrays instead of concatenating
});

export const loadConfig = (
  environment?: string,
  getSecretFn: GetSecretFn = getSecret,
): AppConfig => {
  const env = environment || process.env.NODE_ENV || 'development';

  try {
    // Load default configuration with dependency injection
    const defaultConfig = getDefaultConfig(getSecretFn);

    // Load environment-specific configuration using parameterized functions
    let envConfig: DeepPartial<AppConfig> = {};

    if (env === 'test') {
      envConfig = getTestConfig(getSecretFn);
    } else if (env === 'production') {
      envConfig = getProductionConfig(getSecretFn);
    }
    // For 'development' or any other environment, use empty config (defaults only)

    // Merge configurations using type-safe deep merge
    // Environment-specific config takes precedence over defaults
    const mergedConfig = deepmerge(defaultConfig, envConfig);

    // Validate and return typed configuration
    const result = configSchema.safeParse(mergedConfig);

    if (!result.success) {
      console.error('Configuration validation failed:', result.error.format());
      throw new Error(`Invalid configuration: ${result.error.message}`);
    }

    return result.data;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith('Invalid configuration')
    ) {
      throw error;
    }
    throw new Error(
      `Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Export a function to create custom configurations for testing
export const createTestConfig = (
  overrides: DeepPartial<AppConfig> = {},
  getSecretFn: GetSecretFn = getSecret,
): AppConfig => {
  // Load the standard test configuration using the same pipeline as the main app
  const testBaseConfig = loadConfig('test', getSecretFn);

  // Apply any custom overrides on top of the loaded test configuration
  const mergedConfig = deepmerge(testBaseConfig, overrides);

  // Validate the final configuration
  const result = configSchema.safeParse(mergedConfig);

  if (!result.success) {
    throw new Error(`Invalid test configuration: ${result.error.message}`);
  }

  return result.data;
};
