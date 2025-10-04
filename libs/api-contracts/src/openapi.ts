import { generateOpenApi } from '@ts-rest/open-api';
import { rootContract } from './root-contract.js';
import { zod4Transformer } from './zod-transformer.js';

/**
 * Generated OpenAPI 3.1 document for the Todo API.
 * This document is auto-generated from the ts-rest contracts.
 */
export const openApiDocument = generateOpenApi(
  rootContract,
  {
    info: {
      title: 'Todo API',
      version: '1.0.0',
      description:
        'A RESTful API for managing todos with user authentication. Built with ts-rest, Express, and Zod.',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    tags: [
      {
        name: 'auth',
        description: 'Authentication endpoints',
      },
      {
        name: 'users',
        description: 'User management endpoints',
      },
      {
        name: 'todos',
        description: 'Todo management endpoints',
      },
    ],
  },
  {
    setOperationId: true,
    schemaTransformer: zod4Transformer,
  },
);
