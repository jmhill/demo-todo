import { ResultAsync, errAsync, okAsync } from 'neverthrow';
import { z } from 'zod';
import type { Clock, IdGenerator } from '@demo-todo/infrastructure';
import {
  type User,
  type UserWithHashedPassword,
  type CreateUserCommand,
} from './user-schemas.js';
import {
  type UserError,
  emailAlreadyExists,
  usernameAlreadyExists,
  userNotFound,
  invalidUserId,
  invalidEmailFormat,
  invalidCredentials,
  unexpectedError,
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
  createUser(command: CreateUserCommand): ResultAsync<User, UserError>;
  getById(id: string): ResultAsync<User, UserError>;
  getByEmail(email: string): ResultAsync<User, UserError>;
  getByUsername(username: string): ResultAsync<User, UserError>;
  authenticateUser(
    usernameOrEmail: string,
    password: string,
  ): ResultAsync<User, UserError>;
}

export function createUserService(
  userStore: UserStore,
  passwordHasher: PasswordHasher,
  idGenerator: IdGenerator,
  clock: Clock,
): UserService {
  return {
    createUser(command: CreateUserCommand): ResultAsync<User, UserError> {
      // Check if email exists
      const emailCheck = ResultAsync.fromPromise(
        userStore.findByEmail(command.email),
        (error) => unexpectedError('Database error checking email', error),
      );

      // Check if username exists
      const usernameCheck = ResultAsync.fromPromise(
        userStore.findByUsername(command.username),
        (error) => unexpectedError('Database error checking username', error),
      );

      // Chain all operations without throws
      return ResultAsync.combine([emailCheck, usernameCheck])
        .andThen(([existingUserByEmail, existingUserByUsername]) => {
          if (existingUserByEmail) {
            return errAsync(emailAlreadyExists(command.email));
          }
          if (existingUserByUsername) {
            return errAsync(usernameAlreadyExists(command.username));
          }
          return okAsync(undefined);
        })
        .andThen(() =>
          ResultAsync.fromPromise(
            passwordHasher.hash(command.password),
            (error) => unexpectedError('Password hashing failed', error),
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
            (error) => unexpectedError('Database error saving user', error),
          ).map(() => ({
            id: userWithPassword.id,
            email: userWithPassword.email,
            username: userWithPassword.username,
            createdAt: userWithPassword.createdAt,
            updatedAt: userWithPassword.updatedAt,
          }));
        });
    },

    getById(id: string): ResultAsync<User, UserError> {
      // Validate ID format first
      if (!idGenerator.validate(id)) {
        return errAsync(invalidUserId(id));
      }

      // Find user in store
      return ResultAsync.fromPromise(userStore.findById(id), (error) =>
        unexpectedError('Database error fetching user by ID', error),
      ).andThen((user) => (user ? okAsync(user) : errAsync(userNotFound(id))));
    },

    getByEmail(email: string): ResultAsync<User, UserError> {
      // Validate email format first
      const emailValidation = z.string().email().safeParse(email);
      if (!emailValidation.success) {
        return errAsync(invalidEmailFormat(email));
      }

      // Find user in store
      return ResultAsync.fromPromise(userStore.findByEmail(email), (error) =>
        unexpectedError('Database error fetching user by email', error),
      ).andThen((user) =>
        user ? okAsync(user) : errAsync(userNotFound(email)),
      );
    },

    getByUsername(username: string): ResultAsync<User, UserError> {
      return ResultAsync.fromPromise(
        userStore.findByUsername(username),
        (error) =>
          unexpectedError('Database error fetching user by username', error),
      ).andThen((user) =>
        user ? okAsync(user) : errAsync(userNotFound(username)),
      );
    },

    authenticateUser(
      usernameOrEmail: string,
      password: string,
    ): ResultAsync<User, UserError> {
      // Check if input looks like an email
      const isEmail = usernameOrEmail.includes('@');

      // Try to find user by email or username
      const userPromise = isEmail
        ? userStore.findByEmailWithPassword(usernameOrEmail)
        : userStore.findByUsernameWithPassword(usernameOrEmail);

      return ResultAsync.fromPromise(userPromise, (error) =>
        unexpectedError('Database error during authentication', error),
      )
        .andThen((userWithPassword) => {
          if (!userWithPassword) {
            return errAsync(invalidCredentials());
          }
          return okAsync(userWithPassword);
        })
        .andThen((userWithPassword) =>
          ResultAsync.fromPromise(
            passwordHasher.compare(password, userWithPassword.passwordHash),
            (error) => unexpectedError('Password comparison failed', error),
          ).map((isMatch) => ({ userWithPassword, isMatch })),
        )
        .andThen(({ userWithPassword, isMatch }) => {
          if (!isMatch) {
            return errAsync(invalidCredentials());
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
