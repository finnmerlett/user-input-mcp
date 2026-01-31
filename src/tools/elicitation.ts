import { ElicitResultSchema, type ServerResult } from '@modelcontextprotocol/sdk/types.js'
import { z, toJSONSchema } from 'zod'

import { ToolWithHandler } from './types.js'

/**
 * Schema for user_elicitation tool (MCP elicitation API)
 */
const UserElicitationSchema = z.object({
  prompt: z
    .string()
    .min(1, 'Prompt must not be empty')
    .describe('The prompt to display to the user'),
})

/**
 * Convert a Zod schema to JSON Schema for MCP protocol
 */
function toJsonSchema(schema: z.ZodTypeAny): any {
  const jsonSchema = toJSONSchema(schema) as any
  if (jsonSchema && typeof jsonSchema === 'object' && '$schema' in jsonSchema) {
    delete jsonSchema.$schema
  }
  return jsonSchema
}

export const USER_ELICITATION_TOOL: ToolWithHandler = {
  name: 'user_elicitation',
  description: 'Request additional input from the user during generation',
  inputSchema: toJsonSchema(UserElicitationSchema),
  handler: async (args, extra): Promise<ServerResult> => {
    // Validate input with Zod
    const validatedArgs = UserElicitationSchema.parse(args)

    try {
      const elicitationResult = await extra.sendRequest(
        {
          method: 'elicitation/create',
          params: {
            message: validatedArgs.prompt,
            requestedSchema: {
              type: 'object',
              properties: {
                input: {
                  title: 'String',
                  type: 'string',
                  description: 'Type your answer',
                },
              },
              required: ['input'],
            },
          },
        },
        ElicitResultSchema,
        {
          timeout: 10 * 60 * 1000, // 10 minutes
        },
      )

      switch (elicitationResult.action) {
        case 'accept':
          if (!elicitationResult.content || typeof elicitationResult.content.input !== 'string') {
            return {
              content: [
                {
                  type: 'text',
                  text: `⚠️ Elicitation accepted but no valid input was provided by the user.`,
                },
              ],
            }
          }

          return {
            content: [
              {
                type: 'text',
                text: elicitationResult.content.input,
              },
            ],
          }

        case 'decline':
          return {
            content: [
              {
                type: 'text',
                text: `❌ User declined to provide the requested information.`,
              },
            ],
          }

        case 'cancel':
          return {
            content: [
              {
                type: 'text',
                text: `⚠️ User cancelled the elicitation dialog.`,
              },
            ],
          }
      }
    } catch (error) {
      throw new Error(
        `Failed to get user input: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  },
}
