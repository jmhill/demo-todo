import express, { type Express } from 'express';

export const configureRequestLimits = (app: Express): void => {
  // Limit JSON payloads to 10MB
  app.use(express.json({ limit: '10mb' }));

  // Limit URL-encoded payloads to 10MB
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
};
