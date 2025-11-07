import type { Sequelize, Model } from 'sequelize';
import type { TodoStore } from '../domain/todo-service.js';
import type { Todo } from '../domain/todo-schemas.js';
import {
  defineTodoModel,
  TodoModelAttributesSchema,
} from '../../database/models/todo-model.js';
import {
  defineUserModel,
  UserModelAttributesSchema,
} from '../../database/models/user-model.js';
import {
  defineOrganizationModel,
  OrganizationModelAttributesSchema,
} from '../../database/models/organization-model.js';

export function createSequelizeTodoStore(sequelize: Sequelize): TodoStore {
  const TodoModel = defineTodoModel(sequelize);
  const UserModel = defineUserModel(sequelize);
  const OrganizationModel = defineOrganizationModel(sequelize);

  // Helper to get user UUID from integer user_id
  const getUserUuid = async (userId: number): Promise<string> => {
    const user = await UserModel.findByPk(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    const userData = UserModelAttributesSchema.parse(user.get({ plain: true }));
    return userData.uuid;
  };

  // Helper to get organization UUID from integer organization_id
  const getOrganizationUuid = async (orgId: number): Promise<string> => {
    const org = await OrganizationModel.findByPk(orgId);
    if (!org) {
      throw new Error(`Organization with id ${orgId} not found`);
    }
    const orgData = OrganizationModelAttributesSchema.parse(
      org.get({ plain: true }),
    );
    return orgData.uuid;
  };

  // Helper to get integer user_id from UUID
  const getUserId = async (userUuid: string): Promise<number> => {
    const user = await UserModel.findOne({ where: { uuid: userUuid } });
    if (!user) {
      throw new Error(`User with uuid ${userUuid} not found`);
    }
    const userData = UserModelAttributesSchema.parse(user.get({ plain: true }));
    return userData.id!;
  };

  // Helper to get integer organization_id from UUID
  const getOrganizationId = async (orgUuid: string): Promise<number> => {
    const org = await OrganizationModel.findOne({ where: { uuid: orgUuid } });
    if (!org) {
      throw new Error(`Organization with uuid ${orgUuid} not found`);
    }
    const orgData = OrganizationModelAttributesSchema.parse(
      org.get({ plain: true }),
    );
    return orgData.id!;
  };

  const toTodo = async (model: Model): Promise<Todo> => {
    const data = TodoModelAttributesSchema.parse(model.get({ plain: true }));
    const organizationUuid = await getOrganizationUuid(data.organizationId);
    const createdByUuid = await getUserUuid(data.createdBy);

    return {
      id: data.uuid, // Map database uuid column to domain id
      organizationId: organizationUuid,
      createdBy: createdByUuid,
      title: data.title,
      description: data.description ?? undefined, // Convert null to undefined
      completed: data.completed,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      completedAt: data.completedAt ?? undefined, // Convert null to undefined
    };
  };

  return {
    async save(todo: Todo): Promise<void> {
      const organizationId = await getOrganizationId(todo.organizationId);
      const createdBy = await getUserId(todo.createdBy);

      await TodoModel.create({
        uuid: todo.id, // Map domain id to database uuid column
        organizationId,
        createdBy,
        title: todo.title,
        description: todo.description ?? null, // Convert undefined to null for database
        completed: todo.completed,
        createdAt: todo.createdAt,
        updatedAt: todo.updatedAt,
        completedAt: todo.completedAt ?? null, // Convert undefined to null for database
      });
    },

    async findById(id: string): Promise<Todo | null> {
      // Search by uuid column instead of integer PK
      const model = await TodoModel.findOne({ where: { uuid: id } });
      return model ? await toTodo(model) : null;
    },

    async findByOrganizationId(organizationId: string): Promise<Todo[]> {
      // Check if org exists, return empty array if not
      const org = await OrganizationModel.findOne({
        where: { uuid: organizationId },
      });
      if (!org) {
        return [];
      }

      const organizationIdInt = OrganizationModelAttributesSchema.parse(
        org.get({ plain: true }),
      ).id!;
      const models = await TodoModel.findAll({
        where: {
          organizationId: organizationIdInt, // Use integer organization_id for query
        },
        order: [['createdAt', 'ASC']],
      });
      return Promise.all(models.map((m) => toTodo(m)));
    },

    async update(todo: Todo): Promise<void> {
      await TodoModel.update(
        {
          title: todo.title,
          description: todo.description ?? null, // Convert undefined to null for database
          completed: todo.completed,
          updatedAt: todo.updatedAt,
          completedAt: todo.completedAt ?? null, // Convert undefined to null for database
        },
        {
          where: {
            uuid: todo.id, // Update by uuid column
          },
        },
      );
    },

    async delete(id: string): Promise<void> {
      await TodoModel.destroy({
        where: {
          uuid: id, // Delete by uuid column
        },
      });
    },
  };
}
