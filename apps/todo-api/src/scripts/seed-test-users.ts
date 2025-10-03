import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { createSequelize } from '../database/sequelize-config.js';
import { createSequelizeUserStore } from '../users/infrastructure/user-store-sequelize.js';
import { createUserService } from '../users/domain/user-service.js';
import { createBcryptPasswordHasher } from '../users/infrastructure/bcrypt-password-hasher.js';
import { createUuidIdGenerator } from '../users/infrastructure/uuid-id-generator.js';
import { createSystemClock } from '../users/infrastructure/system-clock.js';
import { loadConfig } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TestUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(8),
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

    console.log(`Seeding ${testUsers.length} test users...`);

    // Seed each user using the service layer
    for (const testUser of testUsers) {
      const result = await userService.createUser(testUser);

      result.match(
        (user) => {
          console.log(
            `✓ Created user: ${user.username} (${user.email}) [ID: ${user.id}]`,
          );
        },
        (error) => {
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
