import {
  MySqlContainer,
  type StartedMySqlContainer,
} from '@testcontainers/mysql';

let container: StartedMySqlContainer;

export default async function globalSetup() {
  console.log('🚀 Starting global test setup...');

  // Start MySQL container
  console.log('🐳 Starting MySQL container for acceptance tests...');
  const startTime = Date.now();

  container = await new MySqlContainer('mysql:8.0')
    .withDatabase('todo_test')
    .withUsername('test')
    .withUserPassword('test')
    .withName('todo-test-mysql')
    .withReuse()
    .start();

  const elapsed = Date.now() - startTime;
  const reused = elapsed < 1000 ? ' (reused existing)' : ' (new container)';
  console.log(`✅ MySQL container ready in ${elapsed}ms${reused}`);

  // Set database config as environment variables for tests to use
  process.env.TEST_DB_HOST = container.getHost();
  process.env.TEST_DB_PORT = String(container.getPort());
  process.env.TEST_DB_USER = container.getUsername();
  process.env.TEST_DB_PASSWORD = container.getUserPassword();
  process.env.TEST_DB_DATABASE = container.getDatabase();

  console.log('📝 Database config set in environment');

  // Return cleanup function
  return async () => {
    console.log('🧹 Running global teardown...');

    // Keep container running for reuse unless explicitly requested to stop
    if (process.env.STOP_CONTAINERS === 'true') {
      await container.stop();
      console.log('🛑 Container stopped');
    } else {
      console.log(
        '♻️  Container kept alive for reuse (set STOP_CONTAINERS=true to stop)',
      );
    }

    // Clean up environment variables
    delete process.env.TEST_DB_HOST;
    delete process.env.TEST_DB_PORT;
    delete process.env.TEST_DB_USER;
    delete process.env.TEST_DB_PASSWORD;
    delete process.env.TEST_DB_DATABASE;
  };
}
