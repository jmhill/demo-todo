import { ResultAsync } from 'neverthrow';
import bcrypt from 'bcrypt';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';
import { z } from 'zod';
import type { UserStore } from './user-store.js';
import {
  CreateUserDtoSchema,
  type User,
  type CreateUserDto,
} from './user-schemas.js';

const SALT_ROUNDS = 10;

export interface UserService {
  createUser(dto: CreateUserDto): ResultAsync<User, Error>;
  getById(id: string): ResultAsync<User, Error>;
  getByEmail(email: string): ResultAsync<User, Error>;
  getByUsername(username: string): ResultAsync<User, Error>;
}

export function createUserService(userStore: UserStore): UserService {
  return {
    createUser(dto: CreateUserDto): ResultAsync<User, Error> {
      return ResultAsync.fromPromise(
        (async () => {
          const validation = CreateUserDtoSchema.safeParse(dto);
          if (!validation.success) {
            const errorMessages = validation.error.issues
              .map((err) => `${err.path.join('.')}: ${err.message}`)
              .join(', ');
            throw new Error(`Validation failed: ${errorMessages}`);
          }

          const [emailExists, usernameExists] = await Promise.all([
            userStore.existsByEmail(dto.email),
            userStore.existsByUsername(dto.username),
          ]);

          if (emailExists) {
            throw new Error('User with this email already exists');
          }

          if (usernameExists) {
            throw new Error('User with this username already exists');
          }

          const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
          const now = new Date();

          const user: User = {
            id: uuidv4(),
            email: dto.email,
            username: dto.username,
            passwordHash,
            createdAt: now,
            updatedAt: now,
          };

          await userStore.save(user);
          return user;
        })(),
        (error) => error as Error,
      );
    },

    getById(id: string): ResultAsync<User, Error> {
      return ResultAsync.fromPromise(
        (async () => {
          if (!uuidValidate(id)) {
            throw new Error('Invalid user ID format');
          }

          const user = await userStore.findById(id);
          if (!user) {
            throw new Error('User not found');
          }
          return user;
        })(),
        (error) => error as Error,
      );
    },

    getByEmail(email: string): ResultAsync<User, Error> {
      return ResultAsync.fromPromise(
        (async () => {
          const emailValidation = z.string().email().safeParse(email);
          if (!emailValidation.success) {
            throw new Error('Invalid email format');
          }

          const user = await userStore.findByEmail(email);
          if (!user) {
            throw new Error('User not found');
          }
          return user;
        })(),
        (error) => error as Error,
      );
    },

    getByUsername(username: string): ResultAsync<User, Error> {
      return ResultAsync.fromPromise(
        (async () => {
          const user = await userStore.findByUsername(username);
          if (!user) {
            throw new Error('User not found');
          }
          return user;
        })(),
        (error) => error as Error,
      );
    },
  };
}
