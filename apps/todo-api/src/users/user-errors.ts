export type UserError =
  | { code: 'VALIDATION_ERROR'; message: string; details?: unknown }
  | { code: 'EMAIL_ALREADY_EXISTS'; email: string }
  | { code: 'USERNAME_ALREADY_EXISTS'; username: string }
  | { code: 'USER_NOT_FOUND'; identifier: string }
  | { code: 'INVALID_USER_ID'; id: string }
  | { code: 'INVALID_EMAIL_FORMAT'; email: string }
  | { code: 'UNEXPECTED_ERROR'; message: string; cause?: unknown };

export type ErrorResponse = {
  statusCode: number;
  body: { error: string };
};

export const toErrorResponse = (error: UserError): ErrorResponse => {
  switch (error.code) {
    case 'VALIDATION_ERROR':
      return { statusCode: 400, body: { error: error.message } };
    case 'EMAIL_ALREADY_EXISTS':
      return { statusCode: 400, body: { error: 'Unable to create account' } };
    case 'USERNAME_ALREADY_EXISTS':
      return { statusCode: 400, body: { error: 'Username already taken' } };
    case 'USER_NOT_FOUND':
      return { statusCode: 404, body: { error: 'User not found' } };
    case 'INVALID_USER_ID':
      return { statusCode: 400, body: { error: 'Invalid user ID format' } };
    case 'INVALID_EMAIL_FORMAT':
      return { statusCode: 400, body: { error: 'Invalid email format' } };
    case 'UNEXPECTED_ERROR':
      return { statusCode: 500, body: { error: 'Internal server error' } };
  }
};

// Error constructor helpers
export const validationError = (zodError: z.ZodError): UserError => {
  const flattened = zodError.flatten();
  const fieldErrors = Object.entries(flattened.fieldErrors)
    .map(([field, errors]) => `${field}: ${(errors as string[])?.join(', ')}`)
    .join(', ');
  return {
    code: 'VALIDATION_ERROR',
    message: `Validation failed: ${fieldErrors}`,
    details: flattened.fieldErrors,
  };
};

export const emailAlreadyExists = (email: string): UserError => ({
  code: 'EMAIL_ALREADY_EXISTS',
  email,
});

export const usernameAlreadyExists = (username: string): UserError => ({
  code: 'USERNAME_ALREADY_EXISTS',
  username,
});

export const userNotFound = (identifier: string): UserError => ({
  code: 'USER_NOT_FOUND',
  identifier,
});

export const invalidUserId = (id: string): UserError => ({
  code: 'INVALID_USER_ID',
  id,
});

export const invalidEmailFormat = (email: string): UserError => ({
  code: 'INVALID_EMAIL_FORMAT',
  email,
});

export const unexpectedError = (
  message: string,
  cause?: unknown,
): UserError => ({
  code: 'UNEXPECTED_ERROR',
  message,
  cause,
});
