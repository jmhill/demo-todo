import { useState, useEffect } from 'react';
import { LoginForm } from './components/LoginForm';
import { UserProfile } from './components/UserProfile';

interface User {
  id: string;
  username: string;
  email: string;
}

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';

export const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [, setToken] = useState<string | null>(null);

  // Load auth state from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    const storedUser = localStorage.getItem(AUTH_USER_KEY);

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as User;
        setToken(storedToken);
        setUser(parsedUser);
      } catch {
        // If parsing fails, clear invalid data
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
      }
    }
  }, []);

  const handleLoginSuccess = (loginUser: User, loginToken: string) => {
    setUser(loginUser);
    setToken(loginToken);
    localStorage.setItem(AUTH_TOKEN_KEY, loginToken);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(loginUser));
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  };

  return (
    <div>
      <h1>Todo App</h1>
      {user ? (
        <UserProfile user={user} onLogout={handleLogout} />
      ) : (
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
};
