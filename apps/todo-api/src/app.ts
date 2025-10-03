import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import { healthCheckHandler } from './healthcheck.js';
import { configureSecureHeaders } from './security/secure-headers.js';
import { configureCors } from './security/cors.js';
import { configureRateLimiting } from './security/rate-limiting.js';
import { configureRequestLimits } from './security/request-limits.js';
import type { AppConfig } from './config/schema.js';
import { createSequelizeUserStore } from './users/infrastructure/user-store-sequelize.js';
import { createSequelize } from './database/sequelize-config.js';
import { createUserService } from './users/domain/user-service.js';
import { createBcryptPasswordHasher } from './users/infrastructure/bcrypt-password-hasher.js';
import { createUuidIdGenerator } from './users/infrastructure/uuid-id-generator.js';
import { createSystemClock } from './users/infrastructure/system-clock.js';
import { createAuthService } from './auth/auth-service.js';
import { createInMemoryTokenStore } from './auth/token-store.js';
import { createAuthMiddleware } from './auth/auth-middleware.js';
import {
  createUserHandler,
  getUserByIdHandler,
} from './users/application/user-handlers.js';
import { createAuthRouter } from './auth/auth-router.js';
import { createExpressEndpoints } from '@ts-rest/express';
import { authContract } from '@demo-todo/api-contracts';
import { createSequelizeTodoStore } from './todos/infrastructure/todo-store-sequelize.js';
import { createTodoService } from './todos/domain/todo-service.js';
import { createUuidIdGenerator as createTodoUuidIdGenerator } from './todos/infrastructure/uuid-id-generator.js';
import { createSystemClock as createTodoSystemClock } from './todos/infrastructure/system-clock.js';
import {
  createTodoHandler,
  listTodosHandler,
  getTodoByIdHandler,
  completeTodoHandler,
} from './todos/application/todo-handlers.js';

export async function createApp(config: AppConfig): Promise<Express> {
  // Wire all dependencies based on config
  // Create Sequelize instance (connection pool)
  const sequelize = createSequelize(config.database);

  // Create stores and services
  const userStore = createSequelizeUserStore(sequelize);
  const userService = createUserService(
    userStore,
    createBcryptPasswordHasher(),
    createUuidIdGenerator(),
    createSystemClock(),
  );

  // Create auth dependencies
  const tokenStore = createInMemoryTokenStore();
  const authService = createAuthService({
    userService,
    tokenStore,
    jwtSecret: config.auth.jwtSecret,
    jwtExpiresIn: config.auth.jwtExpiresIn,
  });

  // Create todo dependencies
  const todoStore = createSequelizeTodoStore(sequelize);
  const todoService = createTodoService(
    todoStore,
    createTodoUuidIdGenerator(),
    createTodoSystemClock(),
  );

  const app = express();

  // Trust proxy configuration for deployments behind load balancers/proxies
  // In production, this should match your actual proxy setup (e.g., number of hops)
  // Using 1 hop as a reasonable default for single proxy/load balancer
  // This allows Express to correctly handle X-Forwarded-* headers without being overly permissive
  app.set('trust proxy', 1);

  // Configure global middleware based on config
  if (config.security.secureHeaders.enabled) {
    configureSecureHeaders(app, config.security.secureHeaders);
  }

  if (config.security.cors.enabled) {
    configureCors(app, config.security.cors);
  }

  if (config.security.rateLimiting.enabled) {
    configureRateLimiting(app, config.security.rateLimiting);
  }

  // JSON and URL-encoded parsing - with or without size limits
  if (config.security.requestLimits.enabled) {
    configureRequestLimits(app, config.security.requestLimits);
  } else {
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
  }

  // Create auth middleware for protected routes
  const requireAuth = createAuthMiddleware(authService, userService);

  // Configure route handlers
  app.get('/health', healthCheckHandler);
  app.post('/health', healthCheckHandler);

  // Auth routes (using ts-rest)
  const authRouter = createAuthRouter(authService);
  createExpressEndpoints(authContract, authRouter, app, {
    logInitialization: false,
  });

  // User routes (all protected)
  app.post('/users', requireAuth, createUserHandler(userService));
  app.get('/users/:id', requireAuth, getUserByIdHandler(userService));

  // Todo routes (all protected)
  app.post('/todos', requireAuth, createTodoHandler(todoService));
  app.get('/todos', requireAuth, listTodosHandler(todoService));
  app.get('/todos/:id', requireAuth, getTodoByIdHandler(todoService));
  app.patch(
    '/todos/:id/complete',
    requireAuth,
    completeTodoHandler(todoService),
  );

  // Global error handler - must be last middleware
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    // Determine status code - check for common HTTP error properties
    const errorWithStatus = err as Error & {
      status?: number;
      statusCode?: number;
    };
    const statusCode =
      errorWithStatus.status || errorWithStatus.statusCode || 500;

    // Only log server errors (5xx), not client errors (4xx)
    if (statusCode >= 500) {
      console.error(err.stack);
    }

    // Send error response
    res.status(statusCode).json({
      error:
        config.environment === 'production'
          ? 'Internal server error'
          : err.message,
    });
  });

  return app;
}
