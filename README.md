# User Prompt MCP Server

A Model Context Protocol (MCP) server that provides a `user_prompt` tool for requesting input from users via CLI.

## Features

- GUI-based user prompts using Electron dialogs
- Built with TypeScript and the official MCP SDK
- 120-minute timeout for user input
- Easy integration with any MCP client (like Claude Desktop or VS Code)

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
    "user-prompt": {
      "command": "node",
      "args": ["/path/to/user-prompt-mcp/build/index.js"]
    }
  }
}
```

Or if installed globally:

```json
{
  "mcpServers": {
    "user-prompt": {
      "command": "user-prompt-mcp"
    }
  }
}
```

### Tool Usage

The server provides one tool:

**`user_prompt`**
- **Description**: Request additional input from the user during generation
- **Parameters**:
  - `prompt` (required): The prompt to display to the user
  - `title` (optional): A title for the input dialog

**Example**:
```json
{
  "name": "user_prompt",
  "arguments": {
    "prompt": "What is your preferred color scheme?",
    "title": "Configuration"
  }
}
```

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

The server spawns an Electron process to display a GUI dialog. When the `user_prompt` tool is called:

1. The server launches an Electron dialog with the prompt
2. The user enters their response in the dialog window
3. The response is returned to the MCP client
4. If no input is provided within 120 minutes, the request times out

## License

MIT
