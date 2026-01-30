import { ElicitResultSchema, type ServerResult } from '@modelcontextprotocol/sdk/types.js'

import { ToolWithHandler } from './types.js'

export const USER_ELICITATION_TOOL: ToolWithHandler = {
  name: 'user_elicitation',
  description: 'Request additional input from the user during generation',
  inputSchema: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'The prompt to display to the user',
      },
    },
    required: ['prompt'],
  },
  handler: async (args, extra): Promise<ServerResult> => {
    const localArgs = args as {
      prompt: string
    }

    if (!localArgs.prompt || typeof localArgs.prompt !== 'string') {
      throw new Error('Missing required argument: prompt')
    }

    try {
      const elicitationResult = await extra.sendRequest(
        {
          method: 'elicitation/create',
          params: {
            message: localArgs.prompt,
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
