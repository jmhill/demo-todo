import { useState, type FormEvent } from 'react';
import { tsr } from '../lib/api-client';

interface LoginFormProps {
  onLoginSuccess: (
    user: { id: string; username: string; email: string },
    token: string,
  ) => void;
}

export const LoginForm = ({ onLoginSuccess }: LoginFormProps) => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loginMutation = tsr.auth.login.useMutation();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    loginMutation.mutate(
      {
        body: {
          usernameOrEmail,
          password,
        },
      },
      {
        onSuccess: (response) => {
          // ts-rest mutations return all responses in onSuccess
          // We need to check the status to determine success vs error
          if (response.status === 200) {
            onLoginSuccess(response.body.user, response.body.token);
          } else {
            // Handle error cases (401, 500)
            setError((response.body as unknown as { message: string }).message);
          }
        },
        onError: () => {
          setError('Network error occurred');
        },
      },
    );
  };

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="usernameOrEmail">Username or Email</label>
          <input
            id="usernameOrEmail"
            type="text"
            value={usernameOrEmail}
            onChange={(e) => setUsernameOrEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <div style={{ color: 'red' }}>{error}</div>}
        <button type="submit" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};
