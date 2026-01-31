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
  prompt: z
    .string()
    .min(1, 'Prompt must not be empty')
    .describe('The prompt to display to the user'),
  title: z
    .string()
    .optional()
    .describe('The title of the input dialog (optional)'),
})

export type UserInputArgs = z.infer<typeof UserInputSchema>

/**
 * Schema for user_elicitation tool (MCP elicitation API)
 */
export const UserElicitationSchema = z.object({
  prompt: z
    .string()
    .min(1, 'Prompt must not be empty')
    .describe('The prompt to display to the user'),
})

export type UserElicitationArgs = z.infer<typeof UserElicitationSchema>

/**
 * Schema for user_apps_input tool (MCP Apps inline UI)
 */
export const UserAppsInputSchema = z.object({
  prompt: z
    .string()
    .min(1, 'Prompt must not be empty')
    .describe('The question or prompt to display to the user'),
  title: z
    .string()
    .optional()
    .describe('Optional title for the input form'),
  options: z
    .array(z.string())
    .optional()
    .describe(
      'Optional array of quick-select button labels for common responses. An "Other..." button is automatically added.'
    ),
  showInput: z
    .boolean()
    .optional()
    .describe(
      'Whether to show the free text input box initially. Defaults to true if no options provided, false if options are provided. Users can always click "Other..." to show the input.'
    ),
})

export type UserAppsInputArgs = z.infer<typeof UserAppsInputSchema>

/**
 * Schema for await_apps_response tool
 */
export const AwaitAppsResponseSchema = z.object({
  requestId: z
    .string()
    .uuid('Request ID must be a valid UUID')
    .describe('The requestId returned by user_apps_input'),
  timeout: z
    .number()
    .positive('Timeout must be positive')
    .optional()
    .describe('Optional timeout in milliseconds (default: 10 minutes)'),
})

export type AwaitAppsResponseArgs = z.infer<typeof AwaitAppsResponseSchema>

/**
 * Schema for __internal__apps_submit tool
 */
export const InternalAppsSubmitSchema = z.object({
  requestId: z
    .string()
    .uuid('Request ID must be a valid UUID')
    .describe('The unique request ID from the user_apps_input call'),
  response: z
    .string()
    .optional()
    .describe("The user's response text"),
  cancelled: z
    .boolean()
    .optional()
    .describe('Whether the user cancelled the input request'),
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
