export const requiredEnvVar = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} not set`);
  }
  return value;
};

export const optionalEnvVar = (name: string, defaultValue: string): string => {
  return process.env[name] || defaultValue;
};

export const parseIntEnv = (name: string, defaultValue: number): number => {
  const value = process.env[name];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a valid integer`);
  }
  return parsed;
};

export const parseBooleanEnv = (
  name: string,
  defaultValue: boolean,
): boolean => {
  const value = process.env[name];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
};

export const parseArrayEnv = (
  name: string,
  defaultValue: string[],
): string[] => {
  const value = process.env[name];
  if (!value) return defaultValue;
  return value.split(',').map((item) => item.trim());
};
