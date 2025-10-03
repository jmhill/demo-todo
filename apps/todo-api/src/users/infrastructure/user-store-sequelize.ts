import type { Sequelize, Model } from 'sequelize';
import type { UserStore } from '../domain/user-store.js';
import type { User, UserWithHashedPassword } from '../domain/user-schemas.js';
import { defineUserModel } from '../../database/models/user-model.js';

export function createSequelizeUserStore(sequelize: Sequelize): UserStore {
  const UserModel = defineUserModel(sequelize);

  const toUser = (model: Model): User => {
    const data = model.get({ plain: true }) as UserWithHashedPassword;
    return {
      id: data.id,
      email: data.email,
      username: data.username,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  };

  const toUserWithPassword = (model: Model): UserWithHashedPassword => {
    const data = model.get({ plain: true }) as UserWithHashedPassword;
    return {
      id: data.id,
      email: data.email,
      username: data.username,
      passwordHash: data.passwordHash,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  };

  return {
    async save(user: UserWithHashedPassword): Promise<void> {
      await UserModel.upsert({
        id: user.id,
        email: user.email.toLowerCase(),
        username: user.username.toLowerCase(),
        passwordHash: user.passwordHash,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    },

    async findById(id: string): Promise<User | null> {
      const model = await UserModel.findByPk(id);
      return model ? toUser(model) : null;
    },

    async findByEmail(email: string): Promise<User | null> {
      const model = await UserModel.findOne({
        where: {
          email: email.toLowerCase(),
        },
      });
      return model ? toUser(model) : null;
    },

    async findByUsername(username: string): Promise<User | null> {
      const model = await UserModel.findOne({
        where: {
          username: username.toLowerCase(),
        },
      });
      return model ? toUser(model) : null;
    },

    async findByEmailWithPassword(
      email: string,
    ): Promise<UserWithHashedPassword | null> {
      const model = await UserModel.findOne({
        where: {
          email: email.toLowerCase(),
        },
      });
      return model ? toUserWithPassword(model) : null;
    },

    async findByUsernameWithPassword(
      username: string,
    ): Promise<UserWithHashedPassword | null> {
      const model = await UserModel.findOne({
        where: {
          username: username.toLowerCase(),
        },
      });
      return model ? toUserWithPassword(model) : null;
    },
  };
}
