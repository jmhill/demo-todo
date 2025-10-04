import { ResultAsync, errAsync, okAsync } from 'neverthrow';
import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';
import type { UserService } from '../../users/domain/user-service.js';
import type { TokenStore } from './token-store.js';
import type { User } from '../../users/domain/user-schemas.js';
import type { TokenPayload, LoginResponse } from '@demo-todo/api-contracts';
import type {
  LoginError,
  LogoutError,
  VerifyTokenError,
} from './auth-errors.js';

export interface VerifyTokenResult {
  userId: string;
}

export interface AuthService {
  login(
    usernameOrEmail: string,
    password: string,
  ): ResultAsync<LoginResponse, LoginError>;
  logout(token: string): ResultAsync<void, LogoutError>;
  verifyToken(token: string): ResultAsync<VerifyTokenResult, VerifyTokenError>;
}

export interface CreateAuthServiceOptions {
  userService: UserService;
  tokenStore: TokenStore;
  jwtSecret: string;
  jwtExpiresIn: string;
}

export function createAuthService(
  options: CreateAuthServiceOptions,
): AuthService {
  const { userService, tokenStore, jwtSecret, jwtExpiresIn } = options;

  return {
    login(
      usernameOrEmail: string,
      password: string,
    ): ResultAsync<LoginResponse, LoginError> {
      const result: ResultAsync<LoginResponse, LoginError> = userService
        .authenticateUser(usernameOrEmail, password)
        .mapErr((userError): LoginError => {
          // Map UserError to LoginError
          if (userError.code === 'INVALID_CREDENTIALS') {
            return {
              code: 'INVALID_CREDENTIALS',
              message: userError.message,
            } as const;
          }
          return {
            code: 'UNEXPECTED_ERROR',
            message: 'Authentication failed',
            cause: userError as unknown,
          };
        })
        .andThen((user: User) => {
          try {
            const payload: TokenPayload = { userId: user.id };
            const signOptions = {
              expiresIn: jwtExpiresIn as StringValue | number,
            };
            const token = jwt.sign(payload, jwtSecret as string, signOptions);

            return okAsync({
              token,
              user: {
                id: user.id,
                email: user.email,
                username: user.username,
              },
            });
          } catch (error) {
            return errAsync({
              code: 'UNEXPECTED_ERROR' as const,
              message: 'Token generation failed',
              cause: error as unknown,
            });
          }
        });
      return result;
    },

    logout(token: string): ResultAsync<void, LogoutError> {
      try {
        // Verify token format before invalidating
        jwt.verify(token, jwtSecret as string);

        return ResultAsync.fromPromise(
          tokenStore.invalidate(token),
          (err): LogoutError => ({
            code: 'UNEXPECTED_ERROR',
            message: 'Token invalidation failed',
            cause: err,
          }),
        );
      } catch {
        return errAsync({
          code: 'INVALID_TOKEN',
          message: 'Invalid token format',
        } as const);
      }
    },

    verifyToken(
      token: string,
    ): ResultAsync<VerifyTokenResult, VerifyTokenError> {
      try {
        const decoded = jwt.verify(token, jwtSecret as string) as TokenPayload;

        return ResultAsync.fromPromise(
          tokenStore.isInvalidated(token),
          (error): VerifyTokenError => ({
            code: 'UNEXPECTED_ERROR',
            message: 'Token validation failed',
            cause: error,
          }),
        ).andThen((isInvalidated) => {
          if (isInvalidated) {
            return errAsync({
              code: 'INVALID_TOKEN',
              message: 'Token has been invalidated',
            } as const);
          }
          return okAsync({ userId: decoded.userId });
        });
      } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
          return errAsync({
            code: 'INVALID_TOKEN',
            message: 'Token has expired',
          } as const);
        }
        if (error instanceof jwt.JsonWebTokenError) {
          return errAsync({
            code: 'INVALID_TOKEN',
            message: 'Invalid token',
          } as const);
        }
        return errAsync({
          code: 'UNEXPECTED_ERROR',
          message: 'Token verification failed',
          cause: error,
        });
      }
    },
  };
}
