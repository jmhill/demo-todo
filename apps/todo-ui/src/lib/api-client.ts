import { initTsrReactQuery } from '@ts-rest/react-query/v5';
import { authContract } from '@demo-todo/api-contracts';

const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const tsr = initTsrReactQuery(authContract, {
  baseUrl,
  baseHeaders: {
    'Content-Type': 'application/json',
    Authorization: () => {
      const token = localStorage.getItem('auth_token');
      return token ? `Bearer ${token}` : '';
    },
  },
});
