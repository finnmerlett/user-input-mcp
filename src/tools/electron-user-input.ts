
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'url'

import { ServerResult } from "@modelcontextprotocol/sdk/types.js";

import type { ToolWithHandler } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Show Electron dialog and get user input
*/
async function promptUser(prompt: string, title?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Get platform-specific Electron binary path
    const electronModule = join(__dirname, '..', '..', 'node_modules', 'electron')
    let electronPath: string
    
    if (process.platform === 'darwin') {
      electronPath = join(electronModule, 'dist', 'Electron.app', 'Contents', 'MacOS', 'Electron')
    } else if (process.platform === 'win32') {
      electronPath = join(electronModule, 'dist', 'electron.exe')
    } else {
      electronPath = join(electronModule, 'dist', 'electron')
    }
    
    // Use absolute path to the electron-prompt script
    const scriptPath = join(__dirname, '..', 'electron-prompt.cjs')

    // Verify paths exist
    if (!existsSync(electronPath)) {
      reject(new Error(`Electron binary not found at: ${electronPath}`))
      return
    }

    if (!existsSync(scriptPath)) {
      reject(new Error(`Electron script not found at: ${scriptPath}`))
      return
    }

    const child = spawn(electronPath, [scriptPath, prompt, title || 'User Input'], {
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

export const USER_INPUT_TOOL: ToolWithHandler = {
  name: 'user_input',
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
  handler: async (args: unknown): Promise<ServerResult> => {
    const localArgs = args as {
      prompt: string
      title?: string
    }

    if (!localArgs.prompt || typeof localArgs.prompt !== 'string') {
      throw new Error('Missing required argument: prompt')
    }

    try {
      const userInput = await promptUser(localArgs.prompt, localArgs.title)

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
  }
}