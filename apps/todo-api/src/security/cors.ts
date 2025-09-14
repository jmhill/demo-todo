import type { Express } from 'express';
import cors from 'cors';
import type { CorsConfig } from '../config/schema.js';

export const configureCors = (app: Express, config: CorsConfig): void => {
  const corsOptions = {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      const allowedOrigins = config.origins;

      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin) {
        callback(null, true);
      } else if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // Don't send CORS headers for unauthorized origins
        callback(null, false);
      }
    },
  };

  app.use(cors(corsOptions));
};
