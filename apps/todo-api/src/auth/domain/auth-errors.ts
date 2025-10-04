// Operation-specific error types
export type LoginError =
  | { code: 'INVALID_CREDENTIALS'; message: string }
  | { code: 'UNEXPECTED_ERROR'; message: string; cause?: unknown };

export type LogoutError =
  | { code: 'INVALID_TOKEN'; message: string }
  | { code: 'UNEXPECTED_ERROR'; message: string; cause?: unknown };

export type VerifyTokenError =
  | { code: 'INVALID_TOKEN'; message: string }
  | { code: 'UNEXPECTED_ERROR'; message: string; cause?: unknown };
