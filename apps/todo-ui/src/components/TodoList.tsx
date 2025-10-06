import { Box, Heading, Spinner, Text } from '@chakra-ui/react';
import { Alert } from '@chakra-ui/react/alert';
import { List } from '@chakra-ui/react/list';
import { Checkbox } from '@chakra-ui/react';
import { tsr } from '../lib/api-client';

export const TodoList = () => {
  const { data, isLoading, isError, refetch } = tsr.todos.listTodos.useQuery({
    queryKey: ['todos'],
  });

  const { mutate: completeTodo } = tsr.todos.completeTodo.useMutation({
    onSuccess: () => {
      refetch();
    },
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

  const incompleteTodos = data?.body.filter((todo) => !todo.completed) || [];

  if (!data || data.status !== 200 || incompleteTodos.length === 0) {
    return (
      <Alert.Root status="info">
        <Alert.Indicator />
        <Alert.Title>No todos yet</Alert.Title>
      </Alert.Root>
    );
  }

  const handleCheckboxChange = (todoId: string) => {
    completeTodo({
      params: { id: todoId },
      body: undefined,
    });
  };

  return (
    <Box borderWidth="1px" borderRadius="lg" p={6}>
      <Heading size="md" mb={4}>
        My Todos
      </Heading>
      <List.Root gap={3}>
        {incompleteTodos.map((todo) => (
          <List.Item
            key={todo.id}
            p={3}
            borderWidth="1px"
            borderRadius="md"
            display="flex"
            alignItems="flex-start"
            gap={3}
          >
            <Checkbox.Root
              checked={false}
              onCheckedChange={() => handleCheckboxChange(todo.id)}
              mt={1}
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control />
            </Checkbox.Root>
            <Box flex={1}>
              <Text fontWeight="bold">{todo.title}</Text>
              {todo.description && (
                <Text fontSize="sm" color="gray.600" mt={1}>
                  {todo.description}
                </Text>
              )}
            </Box>
          </List.Item>
        ))}
      </List.Root>
    </Box>
  );
};
