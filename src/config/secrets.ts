import * as dotenv from 'dotenv';

// Load .env file once at module initialization
dotenv.config();

/**
 * Get a required secret from the environment.
 * Throws an error if the secret is not found.
 */
export const getSecret = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required secret "${key}" not found in environment`);
  }
  return value;
};

/**
 * Get an optional secret from the environment.
 * Returns undefined if the secret is not found.
 */
export const getOptionalSecret = (key: string): string | undefined => {
  return process.env[key];
};
