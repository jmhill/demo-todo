import { initQueryClient } from '@ts-rest/react-query';
import { authContract } from '@demo-todo/api-contracts';

const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const apiClient = initQueryClient(authContract, {
  baseUrl,
  baseHeaders: {},
});
