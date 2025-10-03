import type { Sequelize, Model } from 'sequelize';
import type { TodoStore } from './todo-store.js';
import type { Todo } from './todo-schemas.js';
import { defineTodoModel } from '../database/models/todo-model.js';

export function createSequelizeTodoStore(sequelize: Sequelize): TodoStore {
  const TodoModel = defineTodoModel(sequelize);

  const toTodo = (model: Model): Todo => {
    const data = model.get({ plain: true }) as Todo & {
      description: string | null;
      completedAt: Date | null;
    };
    return {
      id: data.id,
      userId: data.userId,
      title: data.title,
      description: data.description ?? undefined,
      completed: data.completed,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      completedAt: data.completedAt ?? undefined,
    };
  };

  return {
    async save(todo: Todo): Promise<void> {
      await TodoModel.create({
        id: todo.id,
        userId: todo.userId,
        title: todo.title,
        description: todo.description,
        completed: todo.completed,
        createdAt: todo.createdAt,
        updatedAt: todo.updatedAt,
        completedAt: todo.completedAt,
      });
    },

    async findById(id: string): Promise<Todo | null> {
      const model = await TodoModel.findByPk(id);
      return model ? toTodo(model) : null;
    },

    async findByUserId(userId: string): Promise<Todo[]> {
      const models = await TodoModel.findAll({
        where: {
          userId,
        },
        order: [['createdAt', 'ASC']],
      });
      return models.map(toTodo);
    },

    async update(todo: Todo): Promise<void> {
      await TodoModel.update(
        {
          title: todo.title,
          description: todo.description,
          completed: todo.completed,
          updatedAt: todo.updatedAt,
          completedAt: todo.completedAt,
        },
        {
          where: {
            id: todo.id,
          },
        },
      );
    },
  };
}
