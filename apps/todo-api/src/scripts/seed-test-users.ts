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
import { createBcryptPasswordHasher } from '../users/infrastructure/bcrypt-password-hasher.js';
import { loadConfig } from '../config/index.js';
import { createSequelizeTodoStore } from '../todos/infrastructure/todo-store-sequelize.js';
import { createTodoService } from '../todos/domain/todo-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TestTodoSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  completed: z.boolean().optional(),
});

const TestUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  todos: z.array(TestTodoSchema).optional(),
});

const TestUsersSchema = z.array(TestUserSchema);

async function seedTestUsers(): Promise<void> {
  try {
    // Load configuration
    const config = loadConfig();

    // Read test users file
    const testUsersPath = join(__dirname, '../../seed-data/test-users.json');
    const testUsersJson = await readFile(testUsersPath, 'utf-8');
    const testUsersData = JSON.parse(testUsersJson);

    // Validate test users data
    const testUsers = TestUsersSchema.parse(testUsersData);

    // Set up database connection and services
    const sequelize = createSequelize(config.database);
    const userStore = createSequelizeUserStore(sequelize);
    const userService = createUserService(
      userStore,
      createBcryptPasswordHasher(),
      createUuidIdGenerator(),
      createSystemClock(),
    );

    const todoStore = createSequelizeTodoStore(sequelize);
    const todoService = createTodoService(
      todoStore,
      createUuidIdGenerator(),
      createSystemClock(),
    );

    console.log(`Seeding ${testUsers.length} test users...`);

    // Seed each user using the service layer
    for (const testUser of testUsers) {
      const result = await userService.createUser(testUser);

      await result.match(
        async (user) => {
          console.log(
            `✓ Created user: ${user.username} (${user.email}) [ID: ${user.id}]`,
          );

          // Seed todos for this user if present
          if (testUser.todos && testUser.todos.length > 0) {
            console.log(
              `  Seeding ${testUser.todos.length} todos for ${user.username}...`,
            );

            for (const testTodo of testUser.todos) {
              const todoResult = await todoService.createTodo({
                userId: user.id,
                title: testTodo.title,
                description: testTodo.description,
              });

              todoResult.match(
                (todo) => {
                  const status = testTodo.completed ? '✓' : '○';
                  console.log(`    ${status} Created todo: ${todo.title}`);
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
        },
        async (error) => {
          // If user already exists, that's okay - just log it
          if (
            error.code === 'EMAIL_ALREADY_EXISTS' ||
            error.code === 'USERNAME_ALREADY_EXISTS'
          ) {
            console.log(
              `⊘ User already exists: ${testUser.username} (${testUser.email})`,
            );
          } else {
            // For other errors, log and continue
            const errorMessage =
              'message' in error ? error.message : JSON.stringify(error);
            console.error(
              `✗ Failed to create user ${testUser.username}:`,
              errorMessage,
            );
          }
        },
      );
    }

    // Close database connection
    await sequelize.close();
    console.log('\nTest user seeding completed!');
  } catch (error) {
    console.error('Error seeding test users:', error);
    process.exit(1);
  }
}

// Run the seeding script
seedTestUsers();
