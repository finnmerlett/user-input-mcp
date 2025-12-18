#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync } from 'node:fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * User Prompt MCP Server
 *
 * This MCP server provides a tool for prompting the user for input via Electron dialog.
 */

const USER_PROMPT_TOOL: Tool = {
  name: 'user_prompt',
  description: 'Request additional input from the user during generation',
  inputSchema: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'The prompt to display to the user',
      },
      title: {
        type: 'string',
        description: 'The title of the input dialog (optional)',
      },
    },
    required: ['prompt'],
  },
}

/**
 * Show Electron dialog and get user input
 */
async function promptUser(prompt: string, title?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Get platform-specific Electron binary path
    const electronModule = join(__dirname, '..', 'node_modules', 'electron')
    let electronPath: string
    
    if (process.platform === 'darwin') {
      electronPath = join(electronModule, 'dist', 'Electron.app', 'Contents', 'MacOS', 'Electron')
    } else if (process.platform === 'win32') {
      electronPath = join(electronModule, 'dist', 'electron.exe')
    } else {
      electronPath = join(electronModule, 'dist', 'electron')
    }
    
    // Use absolute path to the electron-prompt script
    const scriptPath = join(__dirname, 'electron-prompt.cjs')

    // Verify paths exist
    if (!existsSync(electronPath)) {
      reject(new Error(`Electron binary not found at: ${electronPath}`))
      return
    }

    if (!existsSync(scriptPath)) {
      reject(new Error(`Electron script not found at: ${scriptPath}`))
      return
    }

    const child = spawn(electronPath, [scriptPath, prompt, title || 'User Prompt'], {
      stdio: ['ignore', 'pipe', 'inherit'],
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '' },
    })

    let output = ''

    child.stdout.on('data', (data: Buffer) => {
      output += data.toString()
    })

    child.on('close', (code) => {
      if (output === '[CANCELLED]') {
        reject(new Error('User cancelled the input'))
      } else if (output.trim()) {
        resolve(output.trim())
      } else {
        reject(new Error(`Dialog failed with code ${code}`))
      }
    })

    child.on('error', (err) => {
      reject(new Error(`Failed to launch dialog: ${err.message}`))
    })

    // Timeout after 120 minutes
    setTimeout(
      () => {
        child.kill()
        reject(new Error('User input timeout after 120 minutes'))
      },
      120 * 60 * 1000,
    )
  })
}

/**
 * Create and run the MCP server
 */
async function main() {
  const server = new Server(
    {
      name: 'user-prompt-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [USER_PROMPT_TOOL],
    }
  })

  server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
    if (request.params.name !== 'user_prompt') {
      throw new Error(`Unknown tool: ${request.params.name}`)
    }

    const args = request.params.arguments as {
      prompt: string
      title?: string
    }

    if (!args.prompt) {
      throw new Error('Missing required argument: prompt')
    }

    try {
      const userInput = await promptUser(args.prompt, args.title)

      return {
        content: [
          {
            type: 'text',
            text: userInput,
          },
        ],
      }
    } catch (error) {
      throw new Error(
        `Failed to get user input: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  })

  const transport = new StdioServerTransport()
  await server.connect(transport)

  console.error('User Prompt MCP Server started')
}

await main()
