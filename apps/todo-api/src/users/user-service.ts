import { ResultAsync } from 'neverthrow';
import bcrypt from 'bcrypt';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';
import { z } from 'zod';
import type { UserStore } from './user-store.js';
import { type User, type CreateUserCommand } from './user-schemas.js';
import {
  type UserError,
  emailAlreadyExists,
  usernameAlreadyExists,
  userNotFound,
  invalidUserId,
  invalidEmailFormat,
} from './user-errors.js';

const SALT_ROUNDS = 10;

export interface UserService {
  createUser(command: CreateUserCommand): ResultAsync<User, UserError>;
  getById(id: string): ResultAsync<User, UserError>;
  getByEmail(email: string): ResultAsync<User, UserError>;
  getByUsername(username: string): ResultAsync<User, UserError>;
}

export function createUserService(userStore: UserStore): UserService {
  return {
    createUser(command: CreateUserCommand): ResultAsync<User, UserError> {
      return ResultAsync.fromPromise(
        (async () => {
          const [existingUserByEmail, existingUserByUsername] =
            await Promise.all([
              userStore.findByEmail(command.email),
              userStore.findByUsername(command.username),
            ]);

          if (existingUserByEmail) {
            throw emailAlreadyExists(command.email);
          }

          if (existingUserByUsername) {
            throw usernameAlreadyExists(command.username);
          }

          const passwordHash = await bcrypt.hash(command.password, SALT_ROUNDS);
          const now = new Date();

          const user: User = {
            id: uuidv4(),
            email: command.email,
            username: command.username,
            passwordHash,
            createdAt: now,
            updatedAt: now,
          };

          await userStore.save(user);
          return user;
        })(),
        (error) => error as UserError,
      );
    },

    getById(id: string): ResultAsync<User, UserError> {
      return ResultAsync.fromPromise(
        (async () => {
          if (!uuidValidate(id)) {
            throw invalidUserId(id);
          }

          const user = await userStore.findById(id);
          if (!user) {
            throw userNotFound(id);
          }
          return user;
        })(),
        (error) => error as UserError,
      );
    },

    getByEmail(email: string): ResultAsync<User, UserError> {
      return ResultAsync.fromPromise(
        (async () => {
          const emailValidation = z.string().email().safeParse(email);
          if (!emailValidation.success) {
            throw invalidEmailFormat(email);
          }

          const user = await userStore.findByEmail(email);
          if (!user) {
            throw userNotFound(email);
          }
          return user;
        })(),
        (error) => error as UserError,
      );
    },

    getByUsername(username: string): ResultAsync<User, UserError> {
      return ResultAsync.fromPromise(
        (async () => {
          const user = await userStore.findByUsername(username);
          if (!user) {
            throw userNotFound(username);
          }
          return user;
        })(),
        (error) => error as UserError,
      );
    },
  };
}
