#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
  type ServerNotification,
  type ServerRequest,
} from '@modelcontextprotocol/sdk/types.js'
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js'

import { AVAILABLE_TOOLS, isValidToolName } from './tools/index.js'
import { readInstructions } from './utils/instructions.js'

/**
 * Create and run the MCP server
 */
async function main() {
  const tools = Object.values(AVAILABLE_TOOLS)

  // Read the server instructions
  const instructions = readInstructions()

  /**
   * User Input MCP Server
   *
   * This MCP server provides a tool for requesting user input via Electron dialog.
   */
  const { server } = new McpServer(
    {
      name: 'user-input-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
      instructions,
    },
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools,
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

  const transport = new StdioServerTransport()
  await server.connect(transport)

  console.error('User Input MCP Server started')
}

await main()
