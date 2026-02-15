
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'url'
import { z } from 'zod'

import { ServerResult } from "@modelcontextprotocol/sdk/types.js";

import type { ToolWithHandler } from "./types.js";
import { toJsonSchema } from './zod-utils.js'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Schema for user_input_dialog tool (Electron dialog-based input)
 */
const UserInputDialogSchema = z.object({
  prompt: z
    .string()
    .min(1, 'Prompt must not be empty')
    .describe('The prompt to display to the user'),
  title: z
    .string()
    .optional()
    .describe('The title of the input dialog (optional)'),
})

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

    // Optional timeout via environment variable
    const envTimeout = process.env.USER_INPUT_TIMEOUT_MINUTES
    if (envTimeout) {
      const minutes = parseInt(envTimeout, 10)
      if (!isNaN(minutes) && minutes > 0) {
        setTimeout(
          () => {
            child.kill()
            reject(new Error(`User input timeout after ${minutes} minutes`))
          },
          minutes * 60 * 1000,
        )
      }
    }
  })
}

export const USER_INPUT_DIALOG_TOOL: ToolWithHandler = {
  name: 'user_input_dialog',
  description: 'Request additional input from the user during generation using an Electron dialog window',
  inputSchema: toJsonSchema(UserInputDialogSchema),
  handler: async (args: unknown): Promise<ServerResult> => {
    // Validate input with Zod
    const localArgs = UserInputDialogSchema.parse(args)

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