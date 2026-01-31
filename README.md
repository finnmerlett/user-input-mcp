# User Input MCP Server

A Model Context Protocol (MCP) server that provides tools for requesting input from users during AI-assisted workflows.

## Features

- **Three input methods**: MCP Apps inline UI, GUI-based Electron dialogs, and MCP elicitation API
- **MCP Apps integration**: Displays interactive HTML forms inline within chat interfaces (VS Code Insiders, Claude Desktop)
- Built with TypeScript and the official MCP SDK
- 120-minute timeout for GUI input, 10-minute timeout for elicitation
- Easy integration with any MCP client (Claude Desktop, VS Code, etc.)
- Server instructions for autonomous agent integration

## Installation

### Local Development

```bash
npm install
npm run build
```

### Global Installation

```bash
npm install -g .
```

Or link it locally:

```bash
npm link
```

## Usage

### As an MCP Server

Add to your MCP client configuration (e.g., `~/Library/Application Support/Claude/claude_desktop_config.json` or VS Code's `.vscode/mcp.json`):

```json
{
  "mcpServers": {
    "user-input": {
      "command": "node",
      "args": ["/path/to/user-input-mcp/build/index.js"]
    }
  }
}
```

Or if installed globally:

```json
{
  "mcpServers": {
    "user-input": {
      "command": "user-input-mcp"
    }
  }
}
```

### Tool Usage

The server provides three tools for requesting user input:

---

#### `user_apps_input` ⭐ Recommended

Displays an interactive HTML form inline within the chat interface using the MCP Apps protocol. Best for modern MCP clients that support MCP Apps (VS Code Insiders, Claude Desktop with MCP Apps support).

- **Parameters**:
  - `prompt` (required): The question or prompt to display to the user
  - `title` (optional): A title for the input form
  - `options` (optional): Array of quick-select button labels for common responses
- **Features**:
  - Inline rendering within the chat UI (no external windows)
  - VS Code theme integration (light/dark mode)
  - Auto-expanding multiline textarea
  - Quick-select option buttons
  - Ctrl/Cmd+Enter to submit

**Example**:
```json
{
  "name": "user_apps_input",
  "arguments": {
    "prompt": "How would you like to proceed?",
    "title": "Next Steps",
    "options": ["Continue", "Skip", "Cancel"]
  }
}
```

---

#### `user_input`

A GUI-based tool that opens an Electron dialog window to collect user input. Best for standalone MCP servers or clients without built-in elicitation support.

- **Parameters**:
  - `prompt` (required): The prompt to display to the user
  - `title` (optional): A title for the input dialog window
- **Timeout**: 120 minutes

**Example**:
```json
{
  "name": "user_input",
  "arguments": {
    "prompt": "What is your preferred color scheme?",
    "title": "Configuration"
  }
}
```

---

#### `user_elicitation`

Uses the MCP elicitation API to request input directly through the client's native interface. Best for clients that support elicitation (like VS Code with MCP extension).

- **Parameters**:
  - `prompt` (required): The prompt to display to the user
- **Timeout**: 10 minutes
- **Requires**: Client elicitation capability

**Example**:
```json
{
  "name": "user_elicitation",
  "arguments": {
    "prompt": "Please describe the feature you want to implement"
  }
}
```

**Response Actions**:
- `accept`: User provided input successfully
- `decline`: User declined to provide the requested information
- `cancel`: User cancelled the elicitation dialog

---

### Choosing Between Tools

| Feature | `user_apps_input` | `user_input` | `user_elicitation` |
|---------|------------------|--------------|-------------------|
| Interface | Inline HTML in chat | Electron GUI dialog | Client's native UI |
| Theme support | ✅ VS Code themes | ❌ No | ⚠️ Partial |
| Quick options | ✅ Yes | ❌ No | ❌ No |
| Custom title | ✅ Yes | ✅ Yes | ❌ No |
| Multiline input | ✅ Auto-expand | ❌ No | ❌ No |
| Client support | MCP Apps capable | None | Elicitation capability |
| Best for | VS Code Insiders, modern clients | Standalone, Claude Desktop | Basic MCP clients |

## Development

### Build
```bash
npm run build
```

### Watch Mode
```bash
npm run watch
```

### Run Locally
```bash
npm start
```

## How It Works

### `user_input` (Electron Dialog)

1. The server launches an Electron dialog with the prompt
2. The user enters their response in the dialog window
3. The response is returned to the MCP client
4. If no input is provided within 120 minutes, the request times out

### `user_elicitation` (MCP Elicitation API)

1. The server sends an elicitation request to the MCP client
2. The client displays its native input UI (e.g., VS Code input box)
3. The user's response is captured and returned
4. Handles accept, decline, and cancel actions appropriately
5. If no response within 10 minutes, the request times out

## Server Instructions

This MCP server includes built-in instructions for LLM/agent integration. The instructions guide agents to:

- Always check for user input before completing tasks
- Retry failed user input requests at least once
- Continue working until the task is fully completed

These instructions are automatically provided to compatible MCP clients.

## Project Structure

```
src/
├── index.ts              # Main MCP server entry point
├── docs/
│   └── instructions.md   # Server instructions for LLM integration
├── tools/
│   ├── index.ts          # Tool exports and registry
│   ├── types.ts          # TypeScript types
│   ├── apps-user-input.ts    # MCP Apps inline form tool
│   ├── electron-user-input.ts  # Electron GUI dialog tool
│   └── elicitation.ts    # MCP elicitation API tool
├── ui/
│   └── input-form.html   # MCP Apps inline form HTML
└── utils/
    └── instructions.ts   # Instructions loader utility
docs/
├── stories/              # Feature story documentation
│   └── NNN-feature-name.md
└── templates/
    └── NNN-story-template.md
```

## Development Workflow

New features are developed using a story-driven workflow:

1. **Story Definition**: Each feature starts with a story document in `docs/stories/NNN-feature-name.md`
2. **Branch Creation**: Feature branches are created from `main` with naming convention `feature/NNN-feature-name`
3. **Iterative Development**: Story docs contain detailed task breakdowns with checkboxes for tracking progress
4. **Review & Merge**: Stories are reviewed before merging back to `main`

See `docs/stories/` for active and completed feature stories.

## License

MIT
