// Operation-specific error types
export type CreateUserError =
  | { code: 'EMAIL_ALREADY_EXISTS'; email: string }
  | { code: 'USERNAME_ALREADY_EXISTS'; username: string }
  | { code: 'UNEXPECTED_ERROR'; message: string; cause?: unknown };

export type GetUserByIdError =
  | { code: 'INVALID_USER_ID'; id: string }
  | { code: 'USER_NOT_FOUND'; identifier: string }
  | { code: 'UNEXPECTED_ERROR'; message: string; cause?: unknown };

// Used by authenticateUser (called by auth service)
export type AuthenticateUserError =
  | { code: 'INVALID_EMAIL_FORMAT'; email: string }
  | { code: 'INVALID_CREDENTIALS'; message: string }
  | { code: 'USER_NOT_FOUND'; identifier: string }
  | { code: 'UNEXPECTED_ERROR'; message: string; cause?: unknown };
