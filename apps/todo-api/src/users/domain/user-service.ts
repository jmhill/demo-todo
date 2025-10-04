import { ResultAsync, errAsync, okAsync } from 'neverthrow';
import { z } from 'zod';
import type { Clock, IdGenerator } from '@demo-todo/infrastructure';
import {
  type User,
  type UserWithHashedPassword,
  type CreateUserCommand,
} from './user-schemas.js';
import type {
  CreateUserError,
  GetUserByIdError,
  AuthenticateUserError,
} from './user-errors.js';

// Domain-owned ports - infrastructure implements these
export interface UserStore {
  save(user: UserWithHashedPassword): Promise<void>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findByEmailWithPassword(
    email: string,
  ): Promise<UserWithHashedPassword | null>;
  findByUsernameWithPassword(
    username: string,
  ): Promise<UserWithHashedPassword | null>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
}

export interface UserService {
  createUser(command: CreateUserCommand): ResultAsync<User, CreateUserError>;
  getById(id: string): ResultAsync<User, GetUserByIdError>;
  getByEmail(email: string): ResultAsync<User, AuthenticateUserError>;
  getByUsername(username: string): ResultAsync<User, AuthenticateUserError>;
  authenticateUser(
    usernameOrEmail: string,
    password: string,
  ): ResultAsync<User, AuthenticateUserError>;
}

export function createUserService(
  userStore: UserStore,
  passwordHasher: PasswordHasher,
  idGenerator: IdGenerator,
  clock: Clock,
): UserService {
  return {
    createUser(command: CreateUserCommand): ResultAsync<User, CreateUserError> {
      // Check if email exists
      const emailCheck = ResultAsync.fromPromise(
        userStore.findByEmail(command.email),
        (error): CreateUserError => ({
          code: 'UNEXPECTED_ERROR',
          message: 'Database error checking email',
          cause: error,
        }),
      );

      // Check if username exists
      const usernameCheck = ResultAsync.fromPromise(
        userStore.findByUsername(command.username),
        (error): CreateUserError => ({
          code: 'UNEXPECTED_ERROR',
          message: 'Database error checking username',
          cause: error,
        }),
      );

      // Chain all operations without throws
      return ResultAsync.combine([emailCheck, usernameCheck])
        .andThen(([existingUserByEmail, existingUserByUsername]) => {
          if (existingUserByEmail) {
            return errAsync({
              code: 'EMAIL_ALREADY_EXISTS',
              email: command.email,
            } satisfies CreateUserError);
          }
          if (existingUserByUsername) {
            return errAsync({
              code: 'USERNAME_ALREADY_EXISTS',
              username: command.username,
            } as const);
          }
          return okAsync(undefined);
        })
        .andThen(() =>
          ResultAsync.fromPromise(
            passwordHasher.hash(command.password),
            (error): CreateUserError => ({
              code: 'UNEXPECTED_ERROR',
              message: 'Password hashing failed',
              cause: error,
            }),
          ),
        )
        .andThen((passwordHash) => {
          const now = clock.now();
          const userWithPassword: UserWithHashedPassword = {
            id: idGenerator.generate(),
            email: command.email,
            username: command.username,
            passwordHash,
            createdAt: now,
            updatedAt: now,
          };

          return ResultAsync.fromPromise(
            userStore.save(userWithPassword),
            (error): CreateUserError => ({
              code: 'UNEXPECTED_ERROR',
              message: 'Database error saving user',
              cause: error,
            }),
          ).map(() => ({
            id: userWithPassword.id,
            email: userWithPassword.email,
            username: userWithPassword.username,
            createdAt: userWithPassword.createdAt,
            updatedAt: userWithPassword.updatedAt,
          }));
        });
    },

    getById(id: string): ResultAsync<User, GetUserByIdError> {
      // Validate ID format - domain responsibility for user identity invariants
      if (!idGenerator.validate(id)) {
        return errAsync({ code: 'INVALID_USER_ID', id } as const);
      }

      return ResultAsync.fromPromise(
        userStore.findById(id),
        (error): GetUserByIdError => ({
          code: 'UNEXPECTED_ERROR',
          message: 'Database error fetching user by ID',
          cause: error,
        }),
      ).andThen((user) =>
        user
          ? okAsync(user)
          : errAsync({ code: 'USER_NOT_FOUND', identifier: id } as const),
      );
    },

    getByEmail(email: string): ResultAsync<User, AuthenticateUserError> {
      // Validate email format first
      const emailValidation = z.email().safeParse(email);
      if (!emailValidation.success) {
        return errAsync({ code: 'INVALID_EMAIL_FORMAT', email } as const);
      }

      // Find user in store
      return ResultAsync.fromPromise(
        userStore.findByEmail(email),
        (error): AuthenticateUserError => ({
          code: 'UNEXPECTED_ERROR',
          message: 'Database error fetching user by email',
          cause: error,
        }),
      ).andThen((user) =>
        user
          ? okAsync(user)
          : errAsync({ code: 'USER_NOT_FOUND', identifier: email } as const),
      );
    },

    getByUsername(username: string): ResultAsync<User, AuthenticateUserError> {
      return ResultAsync.fromPromise(
        userStore.findByUsername(username),
        (error): AuthenticateUserError => ({
          code: 'UNEXPECTED_ERROR',
          message: 'Database error fetching user by username',
          cause: error,
        }),
      ).andThen((user) =>
        user
          ? okAsync(user)
          : errAsync({ code: 'USER_NOT_FOUND', identifier: username } as const),
      );
    },

    authenticateUser(
      usernameOrEmail: string,
      password: string,
    ): ResultAsync<User, AuthenticateUserError> {
      // Check if input looks like an email
      const isEmail = usernameOrEmail.includes('@');

      // Try to find user by email or username
      const userPromise = isEmail
        ? userStore.findByEmailWithPassword(usernameOrEmail)
        : userStore.findByUsernameWithPassword(usernameOrEmail);

      return ResultAsync.fromPromise(
        userPromise,
        (error): AuthenticateUserError => ({
          code: 'UNEXPECTED_ERROR',
          message: 'Database error during authentication',
          cause: error,
        }),
      )
        .andThen((userWithPassword) => {
          if (!userWithPassword) {
            return errAsync({
              code: 'INVALID_CREDENTIALS',
              message: 'Invalid credentials',
            } as const);
          }
          return okAsync(userWithPassword);
        })
        .andThen((userWithPassword) =>
          ResultAsync.fromPromise(
            passwordHasher.compare(password, userWithPassword.passwordHash),
            (error): AuthenticateUserError => ({
              code: 'UNEXPECTED_ERROR',
              message: 'Password comparison failed',
              cause: error,
            }),
          ).map((isMatch) => ({ userWithPassword, isMatch })),
        )
        .andThen(({ userWithPassword, isMatch }) => {
          if (!isMatch) {
            return errAsync({
              code: 'INVALID_CREDENTIALS',
              message: 'Invalid credentials',
            } as const);
          }
          // Return user without password hash
          return okAsync({
            id: userWithPassword.id,
            email: userWithPassword.email,
            username: userWithPassword.username,
            createdAt: userWithPassword.createdAt,
            updatedAt: userWithPassword.updatedAt,
          });
        });
    },
  };
}
