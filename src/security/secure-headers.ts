import type { Express } from 'express';
import helmet from 'helmet';

export const configureSecureHeaders = (app: Express): void => {
  app.use(helmet());
};
