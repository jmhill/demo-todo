import type { Sequelize, Model } from 'sequelize';
import type { TodoStore } from '../domain/todo-service.js';
import type { Todo } from '../domain/todo-schemas.js';
import { defineTodoModel } from '../../database/models/todo-model.js';
import { defineUserModel } from '../../database/models/user-model.js';

export function createSequelizeTodoStore(sequelize: Sequelize): TodoStore {
  const TodoModel = defineTodoModel(sequelize);
  const UserModel = defineUserModel(sequelize);

  // Helper to get user UUID from integer user_id
  const getUserUuid = async (userId: number): Promise<string> => {
    const user = await UserModel.findByPk(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    return (user.get({ plain: true }) as any).uuid;
  };

  // Helper to get integer user_id from UUID
  const getUserId = async (userUuid: string): Promise<number> => {
    const user = await UserModel.findOne({ where: { uuid: userUuid } });
    if (!user) {
      throw new Error(`User with uuid ${userUuid} not found`);
    }
    return (user.get({ plain: true }) as any).id;
  };

  const toTodo = async (model: Model): Promise<Todo> => {
    const data = model.get({ plain: true }) as any;
    const userUuid = await getUserUuid(data.userId);

    return {
      id: data.uuid, // Map database uuid column to domain id
      userId: userUuid, // Map database integer user_id to domain userId (UUID)
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
      const userId = await getUserId(todo.userId); // Resolve UUID to integer user_id
      const createData: any = {
        uuid: todo.id, // Map domain id to database uuid column
        userId, // Use integer user_id
        title: todo.title,
        completed: todo.completed,
        createdAt: todo.createdAt,
        updatedAt: todo.updatedAt,
      };

      // Only include optional fields if they're defined
      if (todo.description !== undefined) {
        createData.description = todo.description;
      }
      if (todo.completedAt !== undefined) {
        createData.completedAt = todo.completedAt;
      }

      await TodoModel.create(createData);
    },

    async findById(id: string): Promise<Todo | null> {
      // Search by uuid column instead of integer PK
      const model = await TodoModel.findOne({ where: { uuid: id } });
      return model ? await toTodo(model) : null;
    },

    async findByUserId(userId: string): Promise<Todo[]> {
      const userIdInt = await getUserId(userId); // Resolve UUID to integer user_id
      const models = await TodoModel.findAll({
        where: {
          userId: userIdInt, // Use integer user_id for query
        },
        order: [['createdAt', 'ASC']],
      });
      return Promise.all(models.map((m) => toTodo(m)));
    },

    async update(todo: Todo): Promise<void> {
      const updateData: any = {
        title: todo.title,
        completed: todo.completed,
        updatedAt: todo.updatedAt,
      };

      // Only include description and completedAt if they're defined
      if (todo.description !== undefined) {
        updateData.description = todo.description;
      }
      if (todo.completedAt !== undefined) {
        updateData.completedAt = todo.completedAt;
      }

      await TodoModel.update(updateData, {
        where: {
          uuid: todo.id, // Update by uuid column
        },
      });
    },
  };
}
