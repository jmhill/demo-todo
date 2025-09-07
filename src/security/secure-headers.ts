import type { Express } from 'express';
import helmet from 'helmet';
import type { SecureHeadersConfig } from '../config/schema.js';

export const configureSecureHeaders = (
  app: Express,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  config: SecureHeadersConfig,
): void => {
  app.use(helmet());
};
