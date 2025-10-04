import type { Express } from 'express';
import helmet from 'helmet';
import type { SecureHeadersConfig } from '../config/schema.js';

export const configureSecureHeaders = (
  app: Express,
  config: SecureHeadersConfig,
): void => {
  // If CSP directives are configured, use them; otherwise use Helmet defaults
  if (config.contentSecurityPolicy?.directives) {
    // Filter out undefined values from directives and build clean object
    const directives: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(
      config.contentSecurityPolicy.directives,
    )) {
      if (value !== undefined) {
        directives[key] = value;
      }
    }

    app.use(
      helmet({
        contentSecurityPolicy: {
          directives,
        },
      }),
    );
  } else {
    app.use(helmet());
  }
};
