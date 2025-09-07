import { deepmergeCustom } from 'deepmerge-ts';
import { configSchema, type AppConfig } from './schema.js';

// Create custom deepmerge that replaces arrays instead of concatenating
const deepmerge = deepmergeCustom({
  mergeArrays: false, // Replace arrays instead of concatenating
});

export const loadConfig = async (environment?: string): Promise<AppConfig> => {
  const env = environment || process.env.NODE_ENV || 'development';

  try {
    // Load default configuration
    const { config: defaultConfig } = await import('../../config/default.js');

    // Load environment-specific configuration using static imports
    let envConfig: DeepPartial<AppConfig> = {};

    if (env === 'test') {
      const { config } = await import('../../config/test.js');
      envConfig = config;
    } else if (env === 'production') {
      const { config } = await import('../../config/production.js');
      envConfig = config;
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
): AppConfig => {
  // Create a test-specific base configuration with high rate limits
  const testBaseConfig: AppConfig = {
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

  // Merge configurations using type-safe deep merge
  const mergedConfig = deepmerge(testBaseConfig, overrides);

  const result = configSchema.safeParse(mergedConfig);

  if (!result.success) {
    throw new Error(`Invalid test configuration: ${result.error.message}`);
  }

  return result.data;
};
