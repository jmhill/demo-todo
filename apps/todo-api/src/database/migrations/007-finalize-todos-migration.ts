import { DataTypes, type QueryInterface } from 'sequelize';
import type { MigrationFn } from 'umzug';

export const up: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  const isMySql = queryInterface.sequelize.getDialect() === 'mysql';

  // Change organization_id to NOT NULL
  await queryInterface.changeColumn('todos', 'organization_id', {
    type: isMySql
      ? 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin'
      : DataTypes.CHAR(36),
    allowNull: false,
    references: {
      model: 'organizations',
      key: 'id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  // Change created_by to NOT NULL
  await queryInterface.changeColumn('todos', 'created_by', {
    type: isMySql
      ? 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin'
      : DataTypes.CHAR(36),
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  // Remove old user_id column (this will automatically drop associated foreign keys and indexes)
  await queryInterface.removeColumn('todos', 'user_id');
};

export const down: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  const isMySql = queryInterface.sequelize.getDialect() === 'mysql';

  // Re-add user_id column
  await queryInterface.addColumn('todos', 'user_id', {
    type: isMySql
      ? 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin'
      : DataTypes.CHAR(36),
    allowNull: true, // Nullable for rollback
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  // Make new columns nullable again
  await queryInterface.changeColumn('todos', 'organization_id', {
    type: isMySql
      ? 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin'
      : DataTypes.CHAR(36),
    allowNull: true,
    references: {
      model: 'organizations',
      key: 'id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  await queryInterface.changeColumn('todos', 'created_by', {
    type: isMySql
      ? 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin'
      : DataTypes.CHAR(36),
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });
};
