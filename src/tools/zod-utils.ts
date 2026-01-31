/**
 * Zod utilities for MCP tools
 */

import { z, toJSONSchema } from 'zod'

/**
 * Convert a Zod schema to JSON Schema for MCP protocol
 */
export function toJsonSchema(schema: z.ZodTypeAny): any {
  const jsonSchema = toJSONSchema(schema) as any
  if (jsonSchema && typeof jsonSchema === 'object' && '$schema' in jsonSchema) {
    delete jsonSchema.$schema
  }
  return jsonSchema
}
