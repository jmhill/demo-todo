import { useState, type FormEvent } from 'react';
import {
  Box,
  Button,
  Field,
  Heading,
  Input,
  Spinner,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react';
import { Alert } from '@chakra-ui/react/alert';
import { List } from '@chakra-ui/react/list';
import { Checkbox } from '@chakra-ui/react';
import { tsr } from '../lib/api-client';

interface TodoListProps {
  user: {
    id: string;
    username: string;
    email: string;
  };
}

export const TodoList = ({ user }: TodoListProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  // Use user's personal organization (orgId = userId)
  const orgId = user.id;

  const { data, isLoading, isError, refetch } = tsr.todos.listTodos.useQuery({
    queryKey: ['todos', orgId],
    queryData: { params: { orgId } },
  });

  const { mutate: completeTodo } = tsr.todos.completeTodo.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const createTodoMutation = tsr.todos.createTodo.useMutation();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    createTodoMutation.mutate(
      {
        params: { orgId },
        body: {
          title,
          description,
        },
      },
      {
        onSuccess: (response) => {
          if (response.status === 201) {
            setTitle('');
            setDescription('');
            refetch();
          } else {
            setError((response.body as unknown as { message: string }).message);
          }
        },
        onError: () => {
          setError('Network error occurred');
        },
      },
    );
  };

  const allTodos = data?.body || [];
  const incompleteTodos = allTodos.filter((todo) => !todo.completed);
  const completedTodos = allTodos.filter((todo) => todo.completed);
  const todosToDisplay = showCompleted ? allTodos : incompleteTodos;

  const handleCheckboxChange = (todoId: string) => {
    completeTodo({
      params: { orgId, id: todoId },
      body: undefined,
    });
  };

  return (
    <Stack gap={6}>
      <Box borderWidth="1px" borderRadius="lg" p={6}>
        <Heading size="md" mb={4}>
          Add New Todo
        </Heading>
        <form onSubmit={handleSubmit}>
          <Stack gap={4}>
            <Field.Root required>
              <Field.Label htmlFor="title">Title</Field.Label>
              <Input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field.Root>
            <Field.Root>
              <Field.Label htmlFor="description">Description</Field.Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
              loading={createTodoMutation.isPending}
              loadingText="Creating..."
            >
              Add Todo
            </Button>
          </Stack>
        </form>
      </Box>

      <Box borderWidth="1px" borderRadius="lg" p={6}>
        <Heading size="md" mb={4}>
          My Todos
        </Heading>
        {isLoading ? (
          <Box textAlign="center" py={8}>
            <Spinner size="xl" color="blue.500" />
            <Text mt={4}>Loading todos...</Text>
          </Box>
        ) : isError ? (
          <Alert.Root status="error">
            <Alert.Indicator />
            <Alert.Title>Failed to load todos</Alert.Title>
          </Alert.Root>
        ) : todosToDisplay.length === 0 ? (
          <Alert.Root status="info">
            <Alert.Indicator />
            <Alert.Title>No todos yet</Alert.Title>
          </Alert.Root>
        ) : (
          <>
            {completedTodos.length > 0 && (
              <Box mb={4}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCompleted(!showCompleted)}
                >
                  {showCompleted
                    ? 'Hide completed'
                    : `Show completed (${completedTodos.length})`}
                </Button>
              </Box>
            )}
            <List.Root gap={3}>
              {todosToDisplay.map((todo) => (
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
                    checked={todo.completed}
                    onCheckedChange={() => handleCheckboxChange(todo.id)}
                    mt={1}
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control />
                  </Checkbox.Root>
                  <Box flex={1}>
                    <Text
                      fontWeight="bold"
                      textDecoration={todo.completed ? 'line-through' : 'none'}
                    >
                      {todo.title}
                    </Text>
                    {todo.description && (
                      <Text
                        fontSize="sm"
                        color="gray.600"
                        mt={1}
                        textDecoration={
                          todo.completed ? 'line-through' : 'none'
                        }
                      >
                        {todo.description}
                      </Text>
                    )}
                  </Box>
                </List.Item>
              ))}
            </List.Root>
          </>
        )}
      </Box>
    </Stack>
  );
};
