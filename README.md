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

## Tools

### `user_input_inline__present_ui` ⭐ Recommended

Rich inline UI in the chat (requires MCP Apps support — VS Code, Claude Desktop).

Shows option buttons, free-text input, or both. Each option has an edit pen so you can add context. After calling, the agent must call `user_input_inline__await_presented_ui` with the returned `requestId` to get your response (this instruction is included in the present UI response).

### `user_input_dialog`

Opens an Electron GUI dialog window. Works anywhere with a display — no MCP Apps or elicitation support needed.

### `user_input_elicitation`

Uses the MCP elicitation API for native client-side input. Requires client elicitation capability.

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

This server includes built-in instructions (in `src/docs/instructions.md`) that guide LLMs to check for user input before completing tasks and retry on failure. These are automatically provided to compatible MCP clients.

## Versioning

This package follows [semver](https://semver.org/). Pin to a major version (e.g. `user-input-mcp@1`) to avoid breaking changes.

## License

MIT
