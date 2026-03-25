import { ElicitResultSchema, type ServerResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'

import { ToolWithHandler } from './types.js'
import { toJsonSchema } from './zod-utils.js'

/**
 * Schema for user_input_elicitation tool (MCP elicitation API)
 */
const UserInputElicitationSchema = z.object({
  question: z.string().min(1, 'Question must not be empty')
    .describe(`Question shown as the input field label.
      Write as a single direct question (e.g. "Which database engine should the project use?").
      Put background context in introText, not here.`),
  introText: z
    .string()
    .optional()
    .describe(
      'Context shown above the input field. Provide only when the question is ambiguous without it.',
    ),
})

export const USER_INPUT_ELICITATION_TOOL: ToolWithHandler = {
  name: 'user_input_elicitation',
  description:
    'Ask the user a direct question via the MCP elicitation API and return their answer as plain text. Prefer this tool over user_input_dialog when the client supports elicitation.',
  inputSchema: toJsonSchema(UserInputElicitationSchema),
  handler: async (args, extra): Promise<ServerResult> => {
    // Validate input with Zod
    const localArgs = UserInputElicitationSchema.parse(args)

    try {
      // Get timeout from environment variable, or use undefined (no timeout)
      const envTimeout = process.env.USER_INPUT_TIMEOUT_MINUTES
      const timeoutMs = envTimeout ? parseInt(envTimeout, 10) * 60 * 1000 : undefined

      const requestOptions =
        timeoutMs && !isNaN(timeoutMs) && timeoutMs > 0 ? { timeout: timeoutMs } : {}

      const elicitationResult = await extra.sendRequest(
        {
          method: 'elicitation/create',
          params: {
            message: localArgs.introText ?? localArgs.question,
            requestedSchema: {
              type: 'object',
              properties: {
                input: {
                  title: localArgs.question,
                  type: 'string',
                  description: 'Type your answer',
                },
              },
              required: ['input'],
            },
          },
        },
        ElicitResultSchema,
        requestOptions,
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
