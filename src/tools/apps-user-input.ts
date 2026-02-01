import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import type { ServerResult } from '@modelcontextprotocol/sdk/types.js'
import { RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server'

import { ToolWithHandler } from './types.js'

// Get the directory of the current module
const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * In-memory storage for pending user responses.
 * Maps requestId -> { response?: string, cancelled?: boolean, resolved: boolean }
 */
interface PendingRequest {
  response?: string
  cancelled?: boolean
  resolved: boolean
  resolvers: Array<(value: { response?: string; cancelled?: boolean }) => void>
}

const pendingRequests = new Map<string, PendingRequest>()

// Default timeout for awaiting response (120 minutes, matching documentation)
const DEFAULT_TIMEOUT_MS = 120 * 60 * 1000

/**
 * Store a response for a pending request.
 * Called by the UI via __internal__apps_submit tool.
 */
export function storeResponse(requestId: string, response: string | undefined, cancelled: boolean): boolean {
  const pending = pendingRequests.get(requestId)
  if (!pending) {
    // Create entry if it doesn't exist (UI submitted before await was called)
    pendingRequests.set(requestId, {
      response,
      cancelled,
      resolved: true,
      resolvers: [],
    })
    return true
  }
  
  // Store the response
  pending.response = response
  pending.cancelled = cancelled
  pending.resolved = true
  
  // Notify any waiting resolvers
  for (const resolve of pending.resolvers) {
    resolve({ response, cancelled })
  }
  pending.resolvers = []
  
  return true
}

/**
 * Wait for a response from the UI.
 * Called by await_apps_response tool.
 */
export function waitForResponse(requestId: string, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<{ response?: string; cancelled?: boolean }> {
  return new Promise((resolve, reject) => {
    const pending = pendingRequests.get(requestId)
    
    // If already resolved, return immediately
    if (pending?.resolved) {
      resolve({ response: pending.response, cancelled: pending.cancelled })
      return
    }
    
    // Create or update pending entry
    if (!pending) {
      pendingRequests.set(requestId, {
        resolved: false,
        resolvers: [resolve],
      })
    } else {
      pending.resolvers.push(resolve)
    }
    
    // Set timeout
    setTimeout(() => {
      const p = pendingRequests.get(requestId)
      if (p && !p.resolved) {
        // Remove this resolver and clean up the pending request to avoid leaks
        p.resolvers = p.resolvers.filter((r) => r !== resolve)
        pendingRequests.delete(requestId)
        reject(new Error('Timeout waiting for user response'))
      }
    }, timeoutMs)
  })
}

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
  /** Whether to show the free text input box (defaults to true if no options, false if options provided) */
  showInput?: boolean
}

/**
 * MCP Apps-based user input tool.
 * Displays an interactive form UI for collecting user input.
 */
export const USER_APPS_INPUT_TOOL: ToolWithHandler = {
  name: 'user_apps_input',
  description:
    'Display an interactive form to collect user input during generation. Supports optional quick-select buttons for common responses. An "Other..." button is always added when options are provided, allowing users to enter free text.',
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
        description: 'Optional array of quick-select button labels for common responses. An "Other..." button is automatically added.',
      },
      showInput: {
        type: 'boolean',
        description: 'Whether to show the free text input box initially. Defaults to true if no options provided, false if options are provided. Users can always click "Other..." to show the input.',
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

    if (localArgs.showInput !== undefined && typeof localArgs.showInput !== 'boolean') {
      throw new Error('Invalid argument: showInput must be a boolean')
    }

    // Generate a unique request ID for this input request
    const requestId = randomUUID()

    // Initialize the pending request entry
    pendingRequests.set(requestId, {
      resolved: false,
      resolvers: [],
    })

    // Return the parameters including requestId for the UI
    // The UI will display the form and call __internal__apps_submit when user submits
    // The agent should then call await_apps_response(requestId) to get the response
    return {
      content: [
        {
          type: 'text',
          text: `Input form displayed. Call await_apps_response with requestId: ${requestId} to get the user's response.`,
        },
      ],
      structuredContent: {
        requestId,
        prompt: localArgs.prompt,
        title: localArgs.title,
        options: localArgs.options,
        showInput: localArgs.showInput,
        status: 'pending',
      },
    }
  },
}

/**
 * Internal tool for the UI to store user responses.
 * Called by the MCP Apps UI when the user submits their input.
 * This stores the response in memory for await_apps_response to retrieve.
 */
export const _APPS_SUBMIT_TOOL: ToolWithHandler = {
  name: '__internal__apps_submit',
  description:
    'Internal tool for MCP Apps UI to store user responses. Do not call directly.',
  inputSchema: {
    type: 'object',
    properties: {
      requestId: {
        type: 'string',
        description: 'The unique request ID from the user_apps_input call',
      },
      response: {
        type: 'string',
        description: "The user's response text",
      },
      cancelled: {
        type: 'boolean',
        description: 'Whether the user cancelled the input request',
      },
    },
    required: ['requestId'],
  },
  handler: async (args, _extra): Promise<ServerResult> => {
    const { requestId, response, cancelled } = args as {
      requestId: string
      response?: string
      cancelled?: boolean
    }

    if (!requestId || typeof requestId !== 'string') {
      throw new Error('Missing required argument: requestId')
    }

    storeResponse(requestId, response, cancelled ?? false)

    return {
      content: [
        {
          type: 'text',
          text: 'Response stored',
        },
      ],
    }
  },
}

/**
 * Tool for the agent to await user response.
 * This blocks until the user submits their input via the UI.
 */
export const AWAIT_APPS_RESPONSE_TOOL: ToolWithHandler = {
  name: 'await_apps_response',
  description:
    'Wait for and retrieve the user response from a user_apps_input call. Call this after user_apps_input to get the actual user input. This will block until the user submits their response.',
  inputSchema: {
    type: 'object',
    properties: {
      requestId: {
        type: 'string',
        description: 'The requestId returned by user_apps_input',
      },
      timeout: {
        type: 'number',
        description: 'Optional timeout in milliseconds (default: 10 minutes)',
      },
    },
    required: ['requestId'],
  },
  handler: async (args, _extra): Promise<ServerResult> => {
    const { requestId, timeout } = args as {
      requestId: string
      timeout?: number
    }

    if (!requestId || typeof requestId !== 'string') {
      throw new Error('Missing required argument: requestId')
    }

    try {
      const result = await waitForResponse(requestId, timeout ?? DEFAULT_TIMEOUT_MS)
      
      // Clean up the pending request
      pendingRequests.delete(requestId)

      if (result.cancelled) {
        return {
          content: [
            {
              type: 'text',
              text: '[User cancelled the input request]',
            },
          ],
          structuredContent: {
            requestId,
            cancelled: true,
            response: null,
          },
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: result.response ?? '',
          },
        ],
        structuredContent: {
          requestId,
          cancelled: false,
          response: result.response,
        },
      }
    } catch (error) {
      // Clean up on error
      pendingRequests.delete(requestId)
      
      return {
        content: [
          {
            type: 'text',
            text: `[Error: ${error instanceof Error ? error.message : String(error)}]`,
          },
        ],
        isError: true,
      }
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
