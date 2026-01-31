/**
 * Zod schemas for tool input validation.
 * 
 * This file defines the input schemas for all tools using Zod v4.
 * Schemas provide runtime validation and compile-time type inference.
 */

import { z, toJSONSchema } from 'zod'

/**
 * Schema for user_input tool (Electron dialog-based input)
 */
export const UserInputSchema = z.object({
  prompt: z.string().min(1, 'Prompt must not be empty'),
  title: z.string().optional(),
})

export type UserInputArgs = z.infer<typeof UserInputSchema>

/**
 * Schema for user_elicitation tool (MCP elicitation API)
 */
export const UserElicitationSchema = z.object({
  prompt: z.string().min(1, 'Prompt must not be empty'),
})

export type UserElicitationArgs = z.infer<typeof UserElicitationSchema>

/**
 * Schema for user_apps_input tool (MCP Apps inline UI)
 */
export const UserAppsInputSchema = z.object({
  prompt: z.string().min(1, 'Prompt must not be empty'),
  title: z.string().optional(),
  options: z.array(z.string()).optional(),
  showInput: z.boolean().optional(),
})

export type UserAppsInputArgs = z.infer<typeof UserAppsInputSchema>

/**
 * Schema for await_apps_response tool
 */
export const AwaitAppsResponseSchema = z.object({
  requestId: z.string().uuid('Request ID must be a valid UUID'),
  timeout: z.number().positive('Timeout must be positive').optional(),
})

export type AwaitAppsResponseArgs = z.infer<typeof AwaitAppsResponseSchema>

/**
 * Schema for __internal__apps_submit tool
 */
export const InternalAppsSubmitSchema = z.object({
  requestId: z.string().uuid('Request ID must be a valid UUID'),
  response: z.string().optional(),
  cancelled: z.boolean().optional(),
})

export type InternalAppsSubmitArgs = z.infer<typeof InternalAppsSubmitSchema>

/**
 * Convert a Zod schema to JSON Schema for MCP protocol
 */
export function toJsonSchema(schema: z.ZodTypeAny): any {
  // Use Zod v4's native JSON schema generation
  const jsonSchema = toJSONSchema(schema) as any
  
  // Remove $schema property if present (MCP doesn't need it)
  if (jsonSchema && typeof jsonSchema === 'object' && '$schema' in jsonSchema) {
    delete jsonSchema.$schema
  }
  
  return jsonSchema
}
