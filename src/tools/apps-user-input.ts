import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ServerResult } from '@modelcontextprotocol/sdk/types.js'
import { RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server'

import { ToolWithHandler } from './types.js'

// Get the directory of the current module
const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Resource URI for the user input form UI
 */
export const USER_INPUT_FORM_URI = 'ui://user-input/input-form'

/**
 * Read the HTML form file from disk.
 * The file is located relative to the built output directory.
 */
function readInputFormHtml(): string {
  // In the build output, the HTML file is at ../ui/input-form.html relative to tools/
  const htmlPath = join(__dirname, '..', 'ui', 'input-form.html')
  return readFileSync(htmlPath, 'utf-8')
}

/**
 * Input schema for the user_apps_input tool
 */
export interface UserAppsInputArgs {
  /** The question or prompt to show to the user */
  prompt: string
  /** Optional title for the form */
  title?: string
  /** Optional array of quick-select button labels */
  options?: string[]
}

/**
 * MCP Apps-based user input tool.
 * Displays an interactive form UI for collecting user input.
 */
export const USER_APPS_INPUT_TOOL: ToolWithHandler = {
  name: 'user_apps_input',
  description:
    'Display an interactive form to collect user input during generation. Supports optional quick-select buttons for common responses.',
  inputSchema: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'The question or prompt to display to the user',
      },
      title: {
        type: 'string',
        description: 'Optional title for the input form',
      },
      options: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'Optional array of quick-select button labels for common responses',
      },
    },
    required: ['prompt'],
  },
  // UI metadata for MCP Apps integration
  _meta: {
    ui: {
      resourceUri: USER_INPUT_FORM_URI,
    },
  },
  handler: async (args, _extra): Promise<ServerResult> => {
    const localArgs = args as UserAppsInputArgs

    if (!localArgs.prompt || typeof localArgs.prompt !== 'string') {
      throw new Error('Missing required argument: prompt')
    }

    // Validate optional fields
    if (localArgs.title !== undefined && typeof localArgs.title !== 'string') {
      throw new Error('Invalid argument: title must be a string')
    }

    if (localArgs.options !== undefined) {
      if (!Array.isArray(localArgs.options)) {
        throw new Error('Invalid argument: options must be an array')
      }
      if (!localArgs.options.every((opt) => typeof opt === 'string')) {
        throw new Error('Invalid argument: all options must be strings')
      }
    }

    // The tool returns the input parameters for the UI to use.
    // The actual user input will be collected by the UI and returned
    // through the MCP Apps response mechanism.
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            prompt: localArgs.prompt,
            title: localArgs.title,
            options: localArgs.options,
          }),
        },
      ],
    }
  },
}

/**
 * Resource configuration for the user input form UI.
 * Use this with registerAppResource from @modelcontextprotocol/ext-apps/server
 */
export const USER_INPUT_FORM_RESOURCE = {
  name: 'User Input Form',
  uri: USER_INPUT_FORM_URI,
  description: 'Interactive form for collecting user input',
  mimeType: RESOURCE_MIME_TYPE,
  getContents: () => ({
    contents: [
      {
        uri: USER_INPUT_FORM_URI,
        mimeType: RESOURCE_MIME_TYPE,
        text: readInputFormHtml(),
      },
    ],
  }),
}
