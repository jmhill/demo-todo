import { DataTypes, type QueryInterface } from 'sequelize';
import type { MigrationFn } from 'umzug';

export const up: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  const isMySql = queryInterface.sequelize.getDialect() === 'mysql';

  await queryInterface.createTable('organization_memberships', {
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      allowNull: false,
    },
    user_id: {
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
    },
    organization_id: {
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
    },
    role: {
      type: DataTypes.ENUM('owner', 'admin', 'member', 'viewer'),
      allowNull: false,
      defaultValue: 'member',
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
  await queryInterface.addIndex('organization_memberships', ['user_id'], {
    name: 'organization_memberships_user_id_index',
  });

  await queryInterface.addIndex(
    'organization_memberships',
    ['organization_id'],
    {
      name: 'organization_memberships_organization_id_index',
    },
  );

  // Unique constraint: user can only have one membership per organization
  await queryInterface.addIndex(
    'organization_memberships',
    ['user_id', 'organization_id'],
    {
      unique: true,
      name: 'organization_memberships_user_org_unique',
    },
  );
};

export const down: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  await queryInterface.dropTable('organization_memberships');
};
