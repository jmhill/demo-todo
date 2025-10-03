import { initTsrReactQuery } from '@ts-rest/react-query/v5';
import { initContract } from '@ts-rest/core';
import {
  authContract,
  todoContract,
  userContract,
} from '@demo-todo/api-contracts';

const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Combine all contracts into a single app contract
const c = initContract();
const appContract = c.router({
  auth: authContract,
  todos: todoContract,
  users: userContract,
});

export const tsr = initTsrReactQuery(appContract, {
  baseUrl,
  baseHeaders: {
    'Content-Type': 'application/json',
    Authorization: () => {
      const token = localStorage.getItem('auth_token');
      return token ? `Bearer ${token}` : '';
    },
  },
});
