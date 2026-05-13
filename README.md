# User Input MCP Server

An MCP server that lets AI agents ask you questions and get your input during tasks — via inline chat UI, Electron dialogs, or the MCP elicitation API.

## Quick Start

Add to your VS Code MCP config (`.vscode/mcp.json`):
```json
{
  "servers": {
    "user-input": {
      "command": "npx",
      "args": ["-y", "user-input-mcp"]
    }
  }
}
```

That's it. The AI agent can now ask you questions mid-task.

### Optional: Electron Dialog Support

To use the `user_input_dialog` tool (GUI popup window), install Electron globally:
```bash
npm install -g electron
```

## Enforce Use For LLMs/Agents

Making your agent always ask for input via this MCP can be tricky. Below is the most reliable approach we've found - but feel free to tweak as desired.

Add the following to the end of your global instructions file or system prompt (e.g. `copilot-instructions.md`):
```markdown
--------

### Always read and follow this FIRST for all chats:
Use the preferred user input mcp tool for all questions and menu displays. Unless you are a subagent, NEVER stop chat generation until the user confirms the task is complete. Always always check if the user wants anything else before stopping. If you have a question, or pause, always use the preferred user input mcp tool, NEVER end generation. Print `✅ I will use the preferred user input mcp tool for questions and menus, and will NEVER stop chat generation until the user explicitly confirms done` at the start of the chat to acknowledge this.

MAX PRIORITY: DO NOT STOP CHAT GENERATION UNLESS THE USER EXPLICITLY CONFIRMS DONE. NEVER STOP WITHOUT CHECKING IN VIA USER INPUT MCP, EVEN IF THE TASK SEEMS COMPLETE.

NEXT: now you may continue with whatever prompt or task you were assigned
```

## General Usage Notes
- Claude Sonnet 4.6 and more advanced models from Anthropic tend to be pretty good at using the user input tool, though they do forget after a while.
- Opus 4.6 and higher are better at remembering to ask for next steps even after long generations, but still aren't perfect.
- GPT 5.4 / Gemini 3.1 and higher are decent at asking for user input, but tend to forget after longer autonomous generations and are known to stop prematurely.
- Mileage may vary with lower-end models

## Tools

### `user_input_inline__present_ui` ⭐ Recommended

Rich inline UI in the chat (requires MCP Apps support — VS Code, Claude Desktop).

Shows option buttons, free-text input, or both. Each option has an edit pen so you can add context. After calling, the agent must call `user_input_inline__await_presented_ui` with the returned `requestId` to get your response (this instruction is included in the present UI response).

### `user_input_elicitation`

Uses the MCP elicitation API for native client-side input. Requires client elicitation capability.

### `user_input_dialog`

Opens an Electron GUI dialog window. Requires a separate global Electron install (`npm install -g electron`).

## Configuration

**Timeout**: By default there's no timeout — cancel anytime via the stop button. To set one:

```json
{
  "servers": {
    "user-input": {
      "command": "npx",
      "args": ["-y", "user-input-mcp"],
      "env": {
        "USER_INPUT_TIMEOUT_MINUTES": "60"
      }
    }
  }
}
```

## Development

```bash
git clone https://github.com/finnmerlett/user-input-mcp.git
cd user-input-mcp
npm install
npm run build
npm start
```

To use your local build in an MCP config:
```json
{
  "servers": {
    "user-input": {
      "command": "node",
      "args": ["/absolute/path/to/user-input-mcp/build/index.js"]
    }
  }
}
```

### Project Structure

```
src/
├── index.ts                       # MCP server entry point
├── docs/instructions.md           # LLM/agent integration instructions
├── tools/
│   ├── user-input-inline.ts       # MCP Apps inline form tool
│   ├── user-input-dialog.ts       # Electron GUI dialog tool
│   ├── user-input-elicitation.ts  # MCP elicitation API tool
│   └── zod-utils.ts               # Zod → JSON Schema conversion
├── ui/
│   └── App.tsx                    # Inline form React component
└── utils/
    └── instructions.ts            # Instructions loader
```

### Workflow

Features are developed with story-driven docs in `docs/stories/` and feature branches named `feature/NNN-feature-name`.

## Server Instructions

This server includes built-in instructions (in `src/docs/instructions.md`) that guide LLMs to check for user input before completing tasks and retry on failure. These are automatically provided to compatible MCP clients. If your client doesn't support server instructions, add "Always check for user input before completing tasks" to your system prompt.

## Versioning

This package follows [semver](https://semver.org/). Pin to a major version (e.g. `user-input-mcp@1`) to avoid breaking changes.

## License

MIT
