import express, { type Express } from 'express';
import type { RequestLimitsConfig } from '../config/schema.js';

export const configureRequestLimits = (
  app: Express,
  config: RequestLimitsConfig,
): void => {
  // Limit JSON payloads
  app.use(express.json({ limit: config.jsonLimit }));

  // Limit URL-encoded payloads
  app.use(
    express.urlencoded({ limit: config.urlencodedLimit, extended: true }),
  );
};
