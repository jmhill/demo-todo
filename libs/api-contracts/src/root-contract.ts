import { initContract } from '@ts-rest/core';
import { authContract } from './auth-contract.js';
import { userContract } from './user-contract.js';
import { todoContract } from './todo-contract.js';

const c = initContract();

/**
 * Root contract combining all API contracts.
 * Used for OpenAPI document generation.
 */
export const rootContract = c.router({
  auth: authContract,
  users: userContract,
  todos: todoContract,
});
