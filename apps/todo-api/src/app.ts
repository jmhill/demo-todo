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
import { createSequelizeUserStore } from './users/user-store-sequelize.js';
import { createSequelize } from './database/sequelize-config.js';
import { createUserService } from './users/user-service.js';
import { createAuthService } from './auth/auth-service.js';
import { createInMemoryTokenStore } from './auth/token-store.js';
import { createAuthMiddleware } from './auth/auth-middleware.js';
import {
  createUserHandler,
  getUserByIdHandler,
} from './users/user-handlers.js';
import { loginHandler, logoutHandler } from './auth/auth-handlers.js';

export async function createApp(config: AppConfig): Promise<Express> {
  // Wire all dependencies based on config
  // Create Sequelize instance (connection pool)
  const sequelize = createSequelize(config.database);

  // Create stores and services
  const userStore = createSequelizeUserStore(sequelize);
  const userService = createUserService(userStore);

  // Create auth dependencies
  const tokenStore = createInMemoryTokenStore();
  const authService = createAuthService({
    userService,
    tokenStore,
    jwtSecret: config.auth.jwtSecret,
    jwtExpiresIn: config.auth.jwtExpiresIn,
  });

  // Future dependencies will be added here:
  // const orderStore = createSequelizeOrderStore(sequelize);
  // const orderService = createOrderService(orderStore);

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

  // Auth routes
  app.post('/auth/login', loginHandler(authService));
  app.post('/auth/logout', requireAuth, logoutHandler(authService));

  // User routes (all protected)
  app.post('/users', requireAuth, createUserHandler(userService));
  app.get('/users/:id', requireAuth, getUserByIdHandler(userService));

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
