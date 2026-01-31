import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import type { ServerResult } from '@modelcontextprotocol/sdk/types.js'
import { RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server'
import { z, toJSONSchema } from 'zod'

import { ToolWithHandler } from './types.js'

// Get the directory of the current module
const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Schema for user_apps_input tool (MCP Apps inline UI)
 */
const UserAppsInputSchema = z.object({
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

/**
 * Schema for await_apps_response tool
 */
const AwaitAppsResponseSchema = z.object({
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

/**
 * Schema for __internal__apps_submit tool
 */
const InternalAppsSubmitSchema = z.object({
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

// Default timeout for awaiting response (10 minutes)
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000

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
        p.resolvers = p.resolvers.filter((r) => r !== resolve)
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
 * MCP Apps-based user input tool.
 * Displays an interactive form UI for collecting user input.
 */
export const USER_APPS_INPUT_TOOL: ToolWithHandler = {
  name: 'user_apps_input',
  description:
    'Display an interactive form to collect user input during generation. Supports optional quick-select buttons for common responses. An "Other..." button is always added when options are provided, allowing users to enter free text.',
  inputSchema: toJsonSchema(UserAppsInputSchema),
  // UI metadata for MCP Apps integration
  _meta: {
    ui: {
      resourceUri: USER_INPUT_FORM_URI,
    },
  },
  handler: async (args, _extra): Promise<ServerResult> => {
    // Validate input with Zod
    const validatedArgs = UserAppsInputSchema.parse(args)

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
        prompt: validatedArgs.prompt,
        title: validatedArgs.title,
        options: validatedArgs.options,
        showInput: validatedArgs.showInput,
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
  inputSchema: toJsonSchema(InternalAppsSubmitSchema),
  handler: async (args, _extra): Promise<ServerResult> => {
    // Validate input with Zod
    const validatedArgs = InternalAppsSubmitSchema.parse(args)

    storeResponse(validatedArgs.requestId, validatedArgs.response, validatedArgs.cancelled ?? false)

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
  inputSchema: toJsonSchema(AwaitAppsResponseSchema),
  handler: async (args, _extra): Promise<ServerResult> => {
    // Validate input with Zod
    const validatedArgs = AwaitAppsResponseSchema.parse(args)

    try {
      const result = await waitForResponse(validatedArgs.requestId, validatedArgs.timeout ?? DEFAULT_TIMEOUT_MS)
      
      // Clean up the pending request
      pendingRequests.delete(validatedArgs.requestId)

      if (result.cancelled) {
        return {
          content: [
            {
              type: 'text',
              text: '[User cancelled the input request]',
            },
          ],
          structuredContent: {
            requestId: validatedArgs.requestId,
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
          requestId: validatedArgs.requestId,
          cancelled: false,
          response: result.response,
        },
      }
    } catch (error) {
      // Clean up on error
      pendingRequests.delete(validatedArgs.requestId)
      
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
