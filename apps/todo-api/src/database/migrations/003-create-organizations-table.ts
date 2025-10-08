import { DataTypes, type QueryInterface } from 'sequelize';
import type { MigrationFn } from 'umzug';

export const up: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  const isMySql = queryInterface.sequelize.getDialect() === 'mysql';

  await queryInterface.createTable('organizations', {
    id: {
      type: isMySql
        ? 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin'
        : DataTypes.CHAR(36),
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // Create indexes
  await queryInterface.addIndex('organizations', ['slug'], {
    unique: true,
    name: 'organizations_slug_unique',
  });
};

export const down: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  await queryInterface.dropTable('organizations');
};
