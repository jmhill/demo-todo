import type { Request, Response } from 'express';
import { ok, err, type Result } from 'neverthrow';
import type { TodoService } from './todo-service.js';
import {
  CreateTodoDtoSchema,
  type CreateTodoCommand,
  TodoResponseDtoSchema,
} from './todo-schemas.js';
import {
  type TodoError,
  toErrorResponse,
  validationError,
} from './todo-errors.js';

// Helper: Parse and validate request body into CreateTodoDto, then add userId
const parseCreateTodoDto = (
  body: unknown,
): Result<Omit<CreateTodoCommand, 'userId'>, TodoError> => {
  const result = CreateTodoDtoSchema.safeParse(body);
  return result.success ? ok(result.data) : err(validationError(result.error));
};

// Handler factory for POST /todos - Create a new todo
export const createTodoHandler = (todoService: TodoService) => {
  return async (req: Request, res: Response) => {
    const userId = req.auth!.user.id;

    await parseCreateTodoDto(req.body)
      .asyncAndThen((dto) =>
        todoService.createTodo({
          ...dto,
          userId,
        }),
      )
      .map((todo) => TodoResponseDtoSchema.parse(todo))
      .match(
        (dto) => res.status(201).json(dto),
        (error) => {
          const errorResponse = toErrorResponse(error);
          res.status(errorResponse.statusCode).json(errorResponse.body);
        },
      );
  };
};

// Handler factory for GET /todos - List all todos for authenticated user
export const listTodosHandler = (todoService: TodoService) => {
  return async (req: Request, res: Response) => {
    const userId = req.auth!.user.id;

    await todoService
      .listTodos(userId)
      .map((todos) => todos.map((todo) => TodoResponseDtoSchema.parse(todo)))
      .match(
        (dtos) => res.json(dtos),
        (error) => {
          const errorResponse = toErrorResponse(error);
          res.status(errorResponse.statusCode).json(errorResponse.body);
        },
      );
  };
};

// Handler factory for GET /todos/:id - Get todo by ID
export const getTodoByIdHandler = (todoService: TodoService) => {
  return async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.auth!.user.id;

    if (!id) {
      res.status(400).json({ error: 'Todo ID parameter is required' });
      return;
    }

    await todoService
      .getTodoById({ todoId: id, userId })
      .map((todo) => TodoResponseDtoSchema.parse(todo))
      .match(
        (dto) => res.json(dto),
        (error) => {
          const errorResponse = toErrorResponse(error);
          res.status(errorResponse.statusCode).json(errorResponse.body);
        },
      );
  };
};

// Handler factory for PATCH /todos/:id/complete - Mark todo as complete
export const completeTodoHandler = (todoService: TodoService) => {
  return async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.auth!.user.id;

    if (!id) {
      res.status(400).json({ error: 'Todo ID parameter is required' });
      return;
    }

    await todoService
      .completeTodo({ todoId: id, userId })
      .map((todo) => TodoResponseDtoSchema.parse(todo))
      .match(
        (dto) => res.json(dto),
        (error) => {
          const errorResponse = toErrorResponse(error);
          res.status(errorResponse.statusCode).json(errorResponse.body);
        },
      );
  };
};
