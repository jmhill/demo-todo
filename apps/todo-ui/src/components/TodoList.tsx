import { Box, Heading, Spinner, Text } from '@chakra-ui/react';
import { Alert } from '@chakra-ui/react/alert';
import { List } from '@chakra-ui/react/list';
import { tsr } from '../lib/api-client';

export const TodoList = () => {
  const { data, isLoading, isError } = tsr.todos.listTodos.useQuery({
    queryKey: ['todos'],
  });

  if (isLoading) {
    return (
      <Box textAlign="center" py={8}>
        <Spinner size="xl" color="blue.500" />
        <Text mt={4}>Loading todos...</Text>
      </Box>
    );
  }

  if (isError) {
    return (
      <Alert.Root status="error">
        <Alert.Indicator />
        <Alert.Title>Failed to load todos</Alert.Title>
      </Alert.Root>
    );
  }

  if (!data || data.status !== 200 || data.body.length === 0) {
    return (
      <Alert.Root status="info">
        <Alert.Indicator />
        <Alert.Title>No todos yet</Alert.Title>
      </Alert.Root>
    );
  }

  return (
    <Box borderWidth="1px" borderRadius="lg" p={6}>
      <Heading size="md" mb={4}>
        My Todos
      </Heading>
      <List.Root gap={3}>
        {data.body.map((todo) => (
          <List.Item
            key={todo.id}
            p={3}
            borderWidth="1px"
            borderRadius="md"
            textDecoration={todo.completed ? 'line-through' : 'none'}
            opacity={todo.completed ? 0.6 : 1}
          >
            <Text fontWeight="bold">{todo.title}</Text>
            {todo.description && (
              <Text fontSize="sm" color="gray.600" mt={1}>
                {todo.description}
              </Text>
            )}
          </List.Item>
        ))}
      </List.Root>
    </Box>
  );
};
