import * as dotenv from 'dotenv';
import { z } from 'zod';

// Load .env file once at module initialization
dotenv.config({ quiet: true });

/**
 * Branded type for secrets to provide better type safety.
 * This makes it harder to accidentally use hardcoded strings as secrets.
 */
export type Secret = string & { readonly __brand: 'Secret' };

/**
 * Function signature for secret retrieval.
 * This allows dependency injection of different secret sources.
 */
export type GetSecretFn = (key: string) => Secret;

/**
 * Custom Zod schema that validates Secret branded types.
 * This helps enforce that secrets come from getSecret() functions
 * rather than being hardcoded strings.
 */
export const secretSchema = z.custom<Secret>(
  (data): data is Secret => {
    // At runtime, we can't distinguish branded types from regular strings
    // But this schema serves as documentation and type enforcement
    return typeof data === 'string' && data.length > 0;
  },
  {
    message:
      'Secret must be a non-empty string obtained via getSecret() or getOptionalSecret()',
  },
);

/**
 * Get a required secret from the environment.
 * Throws an error if the secret is not found.
 * Returns a branded Secret type to discourage hardcoded values.
 */
export const getSecret = (key: string): Secret => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required secret "${key}" not found in environment`);
  }
  return value as Secret;
};
