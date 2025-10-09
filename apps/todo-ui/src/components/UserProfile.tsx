import { Box, Button, Heading, Text, Stack, HStack } from '@chakra-ui/react';
import { TodoList } from './TodoList';

interface UserProfileProps {
  user: {
    id: string;
    username: string;
    email: string;
  };
  onLogout: () => void;
}

export const UserProfile = ({ user, onLogout }: UserProfileProps) => {
  return (
    <Stack gap={6} align="stretch">
      <Box borderWidth="1px" borderRadius="lg" p={6}>
        <HStack justify="space-between" mb={4}>
          <Heading size="md">Welcome, {user.username}!</Heading>
          <Button colorScheme="red" size="sm" onClick={onLogout}>
            Logout
          </Button>
        </HStack>
        <Stack gap={2} align="start">
          <Text>
            <strong>Username:</strong> {user.username}
          </Text>
          <Text>
            <strong>Email:</strong> {user.email}
          </Text>
          <Text>
            <strong>User ID:</strong> {user.id}
          </Text>
        </Stack>
      </Box>
      <TodoList user={user} />
    </Stack>
  );
};
