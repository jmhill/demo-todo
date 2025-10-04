import { useState, type FormEvent } from 'react';
import { Box, Button, Field, Heading, Input, Stack } from '@chakra-ui/react';
import { Alert } from '@chakra-ui/react/alert';
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
    <Box maxW="md" mx="auto">
      <Heading size="lg" mb={6} textAlign="center">
        Login
      </Heading>
      <form onSubmit={handleSubmit}>
        <Stack gap={4}>
          <Field.Root required>
            <Field.Label htmlFor="usernameOrEmail">
              Username or Email
            </Field.Label>
            <Input
              id="usernameOrEmail"
              type="text"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
            />
          </Field.Root>
          <Field.Root required>
            <Field.Label htmlFor="password">Password</Field.Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field.Root>
          {error && (
            <Alert.Root status="error">
              <Alert.Indicator />
              <Alert.Title>{error}</Alert.Title>
            </Alert.Root>
          )}
          <Button
            type="submit"
            colorScheme="blue"
            width="full"
            loading={loginMutation.isPending}
            loadingText="Logging in..."
          >
            Login
          </Button>
        </Stack>
      </form>
    </Box>
  );
};
