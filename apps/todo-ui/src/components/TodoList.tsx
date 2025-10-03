import { tsr } from '../lib/api-client';

export const TodoList = () => {
  const { data, isLoading, isError } = tsr.todos.listTodos.useQuery({
    queryKey: ['todos'],
  });

  if (isLoading) {
    return <div>Loading todos...</div>;
  }

  if (isError) {
    return <div>Failed to load todos</div>;
  }

  if (!data || data.status !== 200 || data.body.length === 0) {
    return <div>No todos yet</div>;
  }

  return (
    <div>
      <h3>My Todos</h3>
      <ul>
        {data.body.map((todo) => (
          <li
            key={todo.id}
            style={{
              textDecoration: todo.completed ? 'line-through' : 'none',
            }}
          >
            <strong>{todo.title}</strong>
            {todo.description && <p>{todo.description}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
};
