#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  type CallToolRequest,
  type ReadResourceRequest,
  type ServerNotification,
  type ServerRequest,
} from '@modelcontextprotocol/sdk/types.js'
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js'

import { AVAILABLE_TOOLS, isValidToolName } from './tools/index.js'
import { USER_INPUT_FORM_RESOURCE, USER_INPUT_FORM_URI } from './tools/apps-user-input.js'
import { readInstructions } from './utils/instructions.js'

// Increase listener limit on stdio streams to prevent MaxListenersExceededWarning
// This happens because the MCP SDK's stdio transport adds drain listeners for each write
process.stdout.setMaxListeners(50)
process.stdin.setMaxListeners(50)

/**
 * Create and run the MCP server
 */
async function main() {
  const allTools = Object.values(AVAILABLE_TOOLS)

  // Read the server instructions
  const instructions = readInstructions()

  /**
   * User Input MCP Server
   *
   * This MCP server provides tools for requesting user input during AI-assisted workflows.
   * Available tools:
   * - user_apps_input: Inline HTML form via MCP Apps protocol (recommended)
   * - user_input: GUI-based input via Electron dialog
   * - user_elicitation: Input via MCP elicitation API (requires client support)
   */
  const { server } = new McpServer(
    {
      name: 'user-input-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
      instructions,
    },
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: allTools,
    }
  })

  server.setRequestHandler(
    CallToolRequestSchema,
    async (
      request: CallToolRequest,
      extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
    ) => {
      if (!request.params || !request.params.name) {
        throw new Error('Tool name is required')
      }

      if (!isValidToolName(request.params.name)) {
        throw new Error(`Unknown tool: ${request.params.name}`)
      }

      try {
        return await AVAILABLE_TOOLS[request.params.name].handler(request.params.arguments, extra)
      } catch (error) {
        throw new Error(
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    },
  )

  // Resource handlers for MCP Apps UI
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: USER_INPUT_FORM_RESOURCE.uri,
          name: USER_INPUT_FORM_RESOURCE.name,
          description: USER_INPUT_FORM_RESOURCE.description,
          mimeType: USER_INPUT_FORM_RESOURCE.mimeType,
        },
      ],
    }
  })

  server.setRequestHandler(ReadResourceRequestSchema, async (request: ReadResourceRequest) => {
    if (!request.params?.uri) {
      throw new Error('Resource URI is required')
    }

    if (request.params.uri === USER_INPUT_FORM_URI) {
      return USER_INPUT_FORM_RESOURCE.getContents()
    }

    throw new Error(`Unknown resource: ${request.params.uri}`)
  })

  const transport = new StdioServerTransport()
  await server.connect(transport)

  console.error('User Input MCP Server started')
}

await main()
