import { ResultAsync, errAsync, okAsync } from 'neverthrow';
import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';
import type { UserService } from '../users/user-service.js';
import type { TokenStore } from './token-store.js';
import type { User } from '../users/user-schemas.js';
import type { TokenPayload } from './auth-schemas.js';
import {
  type AuthError,
  invalidToken,
  invalidCredentials,
  unexpectedError,
} from './auth-errors.js';

export interface LoginResult {
  token: string;
  user: {
    id: string;
    email: string;
    username: string;
  };
}

export interface VerifyTokenResult {
  userId: string;
}

export interface AuthService {
  login(
    usernameOrEmail: string,
    password: string,
  ): ResultAsync<LoginResult, AuthError>;
  logout(token: string): ResultAsync<void, AuthError>;
  verifyToken(token: string): ResultAsync<VerifyTokenResult, AuthError>;
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
    ): ResultAsync<LoginResult, AuthError> {
      return userService
        .authenticateUser(usernameOrEmail, password)
        .mapErr((userError) => {
          // Map UserError to AuthError
          if (userError.code === 'INVALID_CREDENTIALS') {
            return invalidCredentials();
          }
          return unexpectedError('Authentication failed', userError);
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
            return errAsync(unexpectedError('Token generation failed', error));
          }
        });
    },

    logout(token: string): ResultAsync<void, AuthError> {
      try {
        // Verify token format before invalidating
        jwt.verify(token, jwtSecret as string);

        return ResultAsync.fromPromise(tokenStore.invalidate(token), (err) =>
          unexpectedError('Token invalidation failed', err),
        );
      } catch {
        return errAsync(invalidToken('Invalid token format'));
      }
    },

    verifyToken(token: string): ResultAsync<VerifyTokenResult, AuthError> {
      try {
        const decoded = jwt.verify(token, jwtSecret as string) as TokenPayload;

        return ResultAsync.fromPromise(
          tokenStore.isInvalidated(token),
          (error) => unexpectedError('Token validation failed', error),
        ).andThen((isInvalidated) => {
          if (isInvalidated) {
            return errAsync(invalidToken('Token has been invalidated'));
          }
          return okAsync({ userId: decoded.userId });
        });
      } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
          return errAsync(invalidToken('Token has expired'));
        }
        if (error instanceof jwt.JsonWebTokenError) {
          return errAsync(invalidToken('Invalid token'));
        }
        return errAsync(unexpectedError('Token verification failed', error));
      }
    },
  };
}
