import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import {
  createUuidIdGenerator,
  createSystemClock,
} from '@demo-todo/infrastructure';
import { createSequelize } from '../database/sequelize-config.js';
import { createSequelizeUserStore } from '../users/infrastructure/user-store-sequelize.js';
import { createUserService } from '../users/domain/user-service.js';
import { createBcryptPasswordHasher } from '../users/infrastructure/password-hasher-bcrypt.js';
import { loadConfig } from '../config/index.js';
import { createSequelizeTodoStore } from '../todos/infrastructure/todo-store-sequelize.js';
import { createTodoService } from '../todos/domain/todo-service.js';
import { createSequelizeOrganizationStore } from '../organizations/infrastructure/organization-store-sequelize.js';
import { createSequelizeMembershipStore } from '../organizations/infrastructure/membership-store-sequelize.js';
import { createOrganizationService } from '../organizations/domain/organization-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TestTodoSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  completed: z.boolean().optional(),
});

const SharedOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/),
});

const MembershipSchema = z.object({
  organizationSlug: z.string(),
  role: z.enum(['owner', 'admin', 'member', 'viewer']),
});

const TestUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  memberships: z.array(MembershipSchema).optional(),
  todos: z.record(z.string(), z.array(TestTodoSchema)).optional(),
});

const TestDataSchema = z.object({
  sharedOrganizations: z.array(SharedOrganizationSchema),
  users: z.array(TestUserSchema),
});

async function seedTestUsers(): Promise<void> {
  try {
    // Load configuration
    const config = loadConfig();

    // Read test data file
    const testDataPath = join(__dirname, '../../seed-data/test-users.json');
    const testDataJson = await readFile(testDataPath, 'utf-8');
    const testDataParsed = JSON.parse(testDataJson);

    // Validate test data
    const testData = TestDataSchema.parse(testDataParsed);

    // Set up database connection and services
    const sequelize = createSequelize(config.database);
    const idGenerator = createUuidIdGenerator();
    const clock = createSystemClock();

    // User service
    const userStore = createSequelizeUserStore(sequelize);
    const userService = createUserService(
      userStore,
      createBcryptPasswordHasher(),
      idGenerator,
      clock,
    );

    // Organization service
    const orgStore = createSequelizeOrganizationStore(sequelize);
    const membershipStore = createSequelizeMembershipStore(sequelize);
    const organizationService = createOrganizationService(
      orgStore,
      membershipStore,
      idGenerator,
      clock,
    );

    // Todo service
    const todoStore = createSequelizeTodoStore(sequelize);
    const todoService = createTodoService(todoStore, idGenerator, clock);

    // Step 1: Create the first user (needed as creator for shared organizations)
    console.log('\nCreating initial user for shared organizations...');
    const firstTestUser = testData.users[0];
    let firstUserId: string | null = null;

    if (!firstTestUser) {
      throw new Error('No users found in test data');
    }

    const firstUserResult = await userService.createUser(firstTestUser);
    await firstUserResult.match(
      (user) => {
        firstUserId = user.id;
        console.log(`✓ Created initial user: ${user.username} (${user.email})`);
      },
      (error) => {
        if (
          error.code === 'EMAIL_ALREADY_EXISTS' ||
          error.code === 'USERNAME_ALREADY_EXISTS'
        ) {
          // User already exists - fetch their ID
          console.log(
            `⊘ User already exists: ${firstTestUser.username} - will fetch ID`,
          );
        } else {
          const errorMessage =
            'message' in error ? error.message : JSON.stringify(error);
          throw new Error(`Failed to create initial user: ${errorMessage}`);
        }
      },
    );

    // If user already existed, fetch their ID
    if (!firstUserId) {
      const existingUser = await userStore.findByUsername(
        firstTestUser.username,
      );
      if (existingUser) {
        firstUserId = existingUser.id;
        console.log(`✓ Found existing user ID: ${firstUserId}`);
      } else {
        throw new Error(`Could not find user: ${firstTestUser.username}`);
      }
    }

    // Create personal organization for first user
    const firstUserPersonalSlug = firstTestUser.username
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-');

    const firstUserPersonalOrgResult =
      await organizationService.createOrganization({
        name: `${firstTestUser.username}'s Personal Workspace`,
        slug: firstUserPersonalSlug,
        createdByUserId: firstUserId,
      });

    if (firstUserPersonalOrgResult.isOk()) {
      console.log(`  ✓ Created personal workspace: ${firstUserPersonalSlug}`);
    } else {
      const error = firstUserPersonalOrgResult.error;
      if (error.code === 'SLUG_ALREADY_EXISTS') {
        console.log(
          `  ⊘ Personal workspace already exists: ${firstUserPersonalSlug}`,
        );
      } else {
        console.error(
          `  ✗ Failed to create personal workspace:`,
          error.message,
        );
      }
    }

    // Step 2: Create shared organizations
    console.log(
      `\nCreating ${testData.sharedOrganizations.length} shared organizations...`,
    );
    const orgSlugToIdMap = new Map<string, string>();

    for (const org of testData.sharedOrganizations) {
      // Check if organization already exists
      const existingOrgResult = await organizationService.getOrganizationBySlug(
        org.slug,
      );

      if (existingOrgResult.isOk()) {
        const existingOrg = existingOrgResult.value;
        orgSlugToIdMap.set(org.slug, existingOrg.id);
        console.log(`⊘ Organization already exists: ${org.name} (${org.slug})`);
      } else {
        // Create new organization
        const createResult = await organizationService.createOrganization({
          name: org.name,
          slug: org.slug,
          createdByUserId: firstUserId,
        });

        await createResult.match(
          (createdOrg) => {
            orgSlugToIdMap.set(org.slug, createdOrg.id);
            console.log(`✓ Created organization: ${org.name} (${org.slug})`);
          },
          (error) => {
            const errorMsg =
              error.code === 'SLUG_ALREADY_EXISTS'
                ? `Slug '${error.slug}' already exists`
                : error.message;
            console.error(
              `✗ Failed to create organization ${org.name}:`,
              errorMsg,
            );
          },
        );
      }
    }

    // Step 3: Create remaining users and their personal organizations
    console.log(`\nSeeding all test users and memberships...`);
    const userUsernameToIdMap = new Map<string, string>();

    // Add first user to the map (already created)
    userUsernameToIdMap.set(firstTestUser.username, firstUserId);

    for (const testUser of testData.users) {
      let userId: string | undefined;

      // Check if this is the first user (already created)
      if (testUser.username === firstTestUser.username) {
        userId = firstUserId;
        console.log(
          `⊘ User already created: ${testUser.username} (${testUser.email})`,
        );
      } else {
        // Create new user
        const result = await userService.createUser(testUser);

        await result.match(
          async (user) => {
            userId = user.id;
            userUsernameToIdMap.set(user.username, user.id);
            console.log(
              `✓ Created user: ${user.username} (${user.email}) [ID: ${user.id}]`,
            );

            // Create a personal organization for this user
            const personalSlug = user.username
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '-');

            const personalOrgResult =
              await organizationService.createOrganization({
                name: `${user.username}'s Personal Workspace`,
                slug: personalSlug,
                createdByUserId: user.id,
              });

            if (personalOrgResult.isOk()) {
              console.log(`  ✓ Created personal workspace: ${personalSlug}`);
            } else {
              const error = personalOrgResult.error;
              const errorMsg =
                error.code === 'SLUG_ALREADY_EXISTS'
                  ? `Slug '${error.slug}' already exists`
                  : error.message;
              console.error(
                `  ✗ Failed to create personal workspace:`,
                errorMsg,
              );
            }
          },
          async (error) => {
            // If user already exists, skip (they already have organizations and todos)
            if (
              error.code === 'EMAIL_ALREADY_EXISTS' ||
              error.code === 'USERNAME_ALREADY_EXISTS'
            ) {
              console.log(
                `⊘ User already exists: ${testUser.username} (${testUser.email}) - skipping`,
              );
              return; // Skip this user entirely
            } else {
              // For other errors, log and continue
              const errorMessage =
                'message' in error ? error.message : JSON.stringify(error);
              console.error(
                `✗ Failed to create user ${testUser.username}:`,
                errorMessage,
              );
              return; // Skip this user entirely
            }
          },
        );
      }

      // Create memberships for shared organizations (for all users including first)
      if (userId && testUser.memberships && testUser.memberships.length > 0) {
        for (const membership of testUser.memberships) {
          const orgId = orgSlugToIdMap.get(membership.organizationSlug);
          if (!orgId) {
            console.warn(
              `  ⚠ Organization not found: ${membership.organizationSlug}`,
            );
            continue;
          }

          // Add member using service
          const addMemberResult = await organizationService.addMember({
            organizationId: orgId,
            userId: userId,
            role: membership.role,
          });

          await addMemberResult.match(
            () => {
              console.log(
                `  ✓ Added to ${membership.organizationSlug} as ${membership.role}`,
              );
            },
            (error) => {
              if (error.code === 'USER_ALREADY_MEMBER') {
                console.log(
                  `  ⊘ Already member of ${membership.organizationSlug}`,
                );
              } else {
                const errorMsg =
                  error.code === 'ORGANIZATION_NOT_FOUND'
                    ? `Organization not found: ${error.organizationId}`
                    : error.message;
                console.error(
                  `  ✗ Failed to add to ${membership.organizationSlug}:`,
                  errorMsg,
                );
              }
            },
          );
        }
      }
    }

    // Step 4: Create todos for each user in their organizations
    console.log(`\nSeeding todos...`);

    for (const testUser of testData.users) {
      const userId = userUsernameToIdMap.get(testUser.username);
      if (!userId) {
        // User already existed and was skipped - don't seed their todos
        continue;
      }

      if (!testUser.todos) {
        continue;
      }

      for (const [orgSlug, todos] of Object.entries(testUser.todos)) {
        const orgId = orgSlugToIdMap.get(orgSlug);
        if (!orgId) {
          console.warn(`  ⚠ Organization not found for todos: ${orgSlug}`);
          continue;
        }

        console.log(
          `  Seeding ${todos.length} todos for ${testUser.username} in ${orgSlug}...`,
        );

        for (const testTodo of todos) {
          const todoResult = await todoService.createTodo({
            organizationId: orgId,
            createdBy: userId,
            title: testTodo.title,
            description: testTodo.description,
          });

          todoResult.match(
            (todo) => {
              const status = testTodo.completed ? '✓' : '○';
              console.log(`    ${status} ${todo.title}`);
            },
            (error) => {
              const errorMessage =
                'message' in error ? error.message : JSON.stringify(error);
              console.error(
                `    ✗ Failed to create todo "${testTodo.title}":`,
                errorMessage,
              );
            },
          );
        }
      }
    }

    // Close database connection
    await sequelize.close();
    console.log('\n✅ Test data seeding completed!');
  } catch (error) {
    console.error('Error seeding test data:', error);
    process.exit(1);
  }
}

// Run the seeding script
seedTestUsers();
