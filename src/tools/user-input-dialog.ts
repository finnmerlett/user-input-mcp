
import { spawn, execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'url'
import { z } from 'zod'

import { ServerResult } from "@modelcontextprotocol/sdk/types.js";

import type { ToolWithHandler } from "./types.js";
import { toJsonSchema } from './zod-utils.js'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Finds the Electron binary path.
 * Checks local node_modules first, then global. Downloads the binary on first use if needed.
 */
function findElectronPath(): string {
  // Check locations in order: local node_modules (dependency), then global
  const candidates: string[] = []

  // Local node_modules (when electron is a dependency)
  candidates.push(join(__dirname, '..', '..', 'node_modules', 'electron'))

  // Global node_modules
  try {
    const globalRoot = execSync('npm root -g', { encoding: 'utf-8', timeout: 10000 }).trim()
    candidates.push(join(globalRoot, 'electron'))
  } catch {
    // npm root -g failed, skip global
  }

  for (const electronModule of candidates) {
    if (!existsSync(join(electronModule, 'index.js'))) continue

    // Check path.txt (written by electron's install script when binary is downloaded)
    const pathFile = join(electronModule, 'path.txt')
    if (existsSync(pathFile)) {
      const relativeBinary = readFileSync(pathFile, 'utf-8').trim()
      const electronPath = join(electronModule, 'dist', relativeBinary)
      if (existsSync(electronPath)) {
        return electronPath
      }
    }

    // Binary not downloaded yet — run electron's install script to download it
    try {
      execSync('node install.js', { cwd: electronModule, timeout: 120000, stdio: 'ignore' })
    } catch {
      continue
    }

    // Re-check path.txt after install
    if (existsSync(pathFile)) {
      const relativeBinary = readFileSync(pathFile, 'utf-8').trim()
      const electronPath = join(electronModule, 'dist', relativeBinary)
      if (existsSync(electronPath)) {
        return electronPath
      }
    }
  }

  throw new Error(
    'Electron binary could not be found or downloaded. Try reinstalling the package, or install electron globally with: npm install -g electron'
  )
}

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
    const electronPath = findElectronPath()
    
    // Use absolute path to the electron-prompt script
    const scriptPath = join(__dirname, '..', 'electron-prompt.cjs')

    // Verify script exists
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
  description: 'Opens an Electron GUI dialog for user input. The Electron binary is downloaded automatically on first use.',
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