import type { QueryInterface } from 'sequelize';
import { QueryTypes } from 'sequelize';
import type { MigrationFn } from 'umzug';
import { randomUUID } from 'node:crypto';

export const up: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    // Get all existing users
    const users = (await queryInterface.sequelize.query(
      'SELECT id, username FROM users',
      { type: QueryTypes.SELECT, transaction },
    )) as Array<{ id: string; username: string }>;

    // For each user, create an organization and membership
    for (const user of users) {
      const orgId = randomUUID();
      const membershipId = randomUUID();
      const now = new Date();

      // Create organization (using username as slug and name)
      await queryInterface.sequelize.query(
        `INSERT INTO organizations (id, name, slug, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        {
          replacements: [orgId, user.username, user.username, now, now],
          transaction,
        },
      );

      // Create owner membership
      await queryInterface.sequelize.query(
        `INSERT INTO organization_memberships (id, user_id, organization_id, role, created_at, updated_at)
         VALUES (?, ?, ?, 'owner', ?, ?)`,
        {
          replacements: [membershipId, user.id, orgId, now, now],
          transaction,
        },
      );

      // Update todos: set organization_id and created_by
      await queryInterface.sequelize.query(
        `UPDATE todos
         SET organization_id = ?, created_by = ?
         WHERE user_id = ?`,
        {
          replacements: [orgId, user.id, user.id],
          transaction,
        },
      );
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

export const down: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    // Clear the new data
    await queryInterface.sequelize.query(
      'UPDATE todos SET organization_id = NULL, created_by = NULL',
      { transaction },
    );
    await queryInterface.sequelize.query(
      'DELETE FROM organization_memberships',
      { transaction },
    );
    await queryInterface.sequelize.query('DELETE FROM organizations', {
      transaction,
    });

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
