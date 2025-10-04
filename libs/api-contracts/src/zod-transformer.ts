import { z } from 'zod';
import type { SchemaTransformerSync } from '@ts-rest/open-api';

/**
 * Zod 4 schema transformer for ts-rest OpenAPI generation.
 * Converts Zod schemas to OpenAPI-compatible JSON schemas.
 *
 * Uses Zod 4's built-in toJSONSchema() which outputs JSON Draft 2022-12,
 * compatible with OpenAPI 3.1.
 */
export const zod4Transformer: SchemaTransformerSync = ({ schema }) => {
  if (schema instanceof z.ZodType) {
    const jsonSchema = z.toJSONSchema(schema, { unrepresentable: 'any' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return jsonSchema as any;
  }
  return null;
};
