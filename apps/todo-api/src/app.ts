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
import { createSequelize } from './database/sequelize-config.js';
import {
  createSequelizeUserStore,
  createUserService,
  createBcryptPasswordHasher,
  createUserRouter,
} from './users/index.js';
import {
  createAuthService,
  createInMemoryTokenStore,
  createAuthMiddleware,
  createAuthRouter,
} from './auth/index.js';
import { createExpressEndpoints } from '@ts-rest/express';
import {
  authContract,
  userContract,
  todoContract,
  organizationContract,
  openApiDocument,
} from '@demo-todo/api-contracts';
import { apiReference } from '@scalar/express-api-reference';
import {
  createSequelizeTodoStore,
  createTodoService,
  createTodoRouter,
} from './todos/index.js';
import {
  createSequelizeOrganizationStore,
  createSequelizeMembershipStore,
  createOrganizationService,
  createOrganizationRouter,
} from './organizations/index.js';
import {
  createSystemClock,
  createUuidIdGenerator,
} from '@demo-todo/infrastructure';

export function createApp(config: AppConfig): Express {
  // Wire all dependencies based on config
  // Create Sequelize instance (connection pool)
  const sequelize = createSequelize(config.database);

  // Create stores and services
  const userStore = createSequelizeUserStore(sequelize);
  const userIdGenerator = createUuidIdGenerator();
  const userService = createUserService(
    userStore,
    createBcryptPasswordHasher(),
    userIdGenerator,
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
  const todoIdGenerator = createUuidIdGenerator();
  const todoService = createTodoService(
    todoStore,
    todoIdGenerator,
    createSystemClock(),
  );

  // Create organization dependencies
  const organizationStore = createSequelizeOrganizationStore(sequelize);
  const membershipStore = createSequelizeMembershipStore(sequelize);
  const organizationIdGenerator = createUuidIdGenerator();
  const organizationService = createOrganizationService(
    organizationStore,
    membershipStore,
    organizationIdGenerator,
    createSystemClock(),
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

  // OpenAPI documentation (development only)
  if (config.docSite.enabled) {
    // Serve OpenAPI JSON document
    app.get('/openapi.json', (_req, res) => {
      res.json(openApiDocument);
    });

    // Serve Scalar API documentation UI
    app.use(
      '/docs',
      apiReference({
        content: openApiDocument,
      }),
    );
  }

  // Auth routes (using ts-rest)
  const authRouter = createAuthRouter(authService);
  createExpressEndpoints(authContract, authRouter, app, {
    logInitialization: false,
  });

  // User routes (using ts-rest, all protected)
  const userRouter = createUserRouter(userService);
  createExpressEndpoints(userContract, userRouter, app, {
    logInitialization: false,
    globalMiddleware: [requireAuth],
  });

  // Todo routes (using ts-rest, all protected)
  const todoRouter = createTodoRouter(todoService);
  createExpressEndpoints(todoContract, todoRouter, app, {
    logInitialization: false,
    globalMiddleware: [requireAuth],
  });

  // Organization routes (using ts-rest, all protected)
  const organizationRouter = createOrganizationRouter(organizationService);
  createExpressEndpoints(organizationContract, organizationRouter, app, {
    logInitialization: false,
    globalMiddleware: [requireAuth],
  });

  // Global error handler - must be last middleware
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
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
