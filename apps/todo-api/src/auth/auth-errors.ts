export type AuthError =
  | { code: 'INVALID_CREDENTIALS'; message: string }
  | { code: 'INVALID_TOKEN'; message: string }
  | { code: 'TOKEN_EXPIRED'; message: string }
  | { code: 'MISSING_TOKEN'; message: string }
  | { code: 'UNEXPECTED_ERROR'; message: string; cause?: unknown };

export type ErrorResponse = {
  statusCode: number;
  body: { error: string };
};

export const toErrorResponse = (error: AuthError): ErrorResponse => {
  switch (error.code) {
    case 'INVALID_CREDENTIALS':
      return { statusCode: 401, body: { error: 'Invalid credentials' } };
    case 'INVALID_TOKEN':
      return { statusCode: 401, body: { error: 'Invalid token' } };
    case 'TOKEN_EXPIRED':
      return { statusCode: 401, body: { error: 'Token expired' } };
    case 'MISSING_TOKEN':
      return {
        statusCode: 401,
        body: { error: 'Missing authorization token' },
      };
    case 'UNEXPECTED_ERROR':
      return { statusCode: 500, body: { error: 'Internal server error' } };
  }
};

// Error constructor helpers
export const invalidCredentials = (
  message = 'Invalid credentials',
): AuthError => ({
  code: 'INVALID_CREDENTIALS',
  message,
});

export const invalidToken = (message = 'Invalid token'): AuthError => ({
  code: 'INVALID_TOKEN',
  message,
});

export const tokenExpired = (message = 'Token expired'): AuthError => ({
  code: 'TOKEN_EXPIRED',
  message,
});

export const missingToken = (
  message = 'Missing authorization token',
): AuthError => ({
  code: 'MISSING_TOKEN',
  message,
});

export const unexpectedError = (
  message: string,
  cause?: unknown,
): AuthError => ({
  code: 'UNEXPECTED_ERROR',
  message,
  cause,
});
