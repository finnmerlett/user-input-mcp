# 001 - MCP Apps Input Tool

## Overview

Add a new user input tool that leverages the **MCP Apps protocol** to render an interactive HTML form directly within the chat interface. This provides a native, integrated experience compared to external Electron dialogs or the basic elicitation API.

## Status

🟡 **In Progress**

## Background

The MCP Apps protocol (SEP-1865) enables MCP servers to deliver interactive HTML UIs that render inline in chat interfaces. VS Code Insiders (and other compatible hosts like Claude Desktop) support this over stdio transport.

### Benefits over existing tools

| Feature | `user_input` (Electron) | `user_elicitation` | `user_apps_input` (New) |
|---------|------------------------|-------------------|------------------------|
| Inline in chat | ❌ External window | ✅ Native UI | ✅ Custom HTML |
| Custom styling | ❌ Limited | ❌ None | ✅ Full control |
| Theme integration | ❌ No | ⚠️ Partial | ✅ VS Code theme vars |
| Multi-field forms | ❌ No | ❌ No | ✅ Extensible |
| Rich interactions | ❌ No | ❌ No | ✅ JavaScript |

## Requirements

### Functional Requirements

1. Display a styled input form inline within the chat
2. Show customizable title and prompt/question
3. Provide text input field for user response
4. Include Submit and Cancel buttons
5. Return user input to the calling tool
6. Handle submission, cancellation, and timeout gracefully

### Non-Functional Requirements

1. Follow VS Code design language
2. Support VS Code theme CSS variables for light/dark mode
3. Responsive design within iframe constraints
4. Accessible form elements (labels, ARIA, keyboard nav)

## Technical Design

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ VS Code Host                                                │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Chat Interface                                          ││
│  │  ┌─────────────────────────────────────────────────────┐││
│  │  │ Sandboxed iframe (ui://user-input/form.html)        │││
│  │  │  ┌──────────────────────────────────────────────┐   │││
│  │  │  │ HTML Form                                    │   │││
│  │  │  │ - Title                                      │   │││
│  │  │  │ - Prompt                                     │   │││
│  │  │  │ - Input field                                │   │││
│  │  │  │ - Submit/Cancel buttons                      │   │││
│  │  │  └──────────────────────────────────────────────┘   │││
│  │  │         ↕ postMessage (JSON-RPC)                    │││
│  │  └─────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────┘│
│              ↕ MCP stdio                                    │
└─────────────────────────────────────────────────────────────┘
              ↕
┌─────────────────────────────────────────────────────────────┐
│ MCP Server (user-input-mcp)                                 │
│  - user_apps_input tool                                     │
│  - ui://user-input/form.html resource                       │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Tool Call**: Agent calls `user_apps_input` with `{ prompt, title? }`
2. **UI Render**: Host fetches `ui://user-input/form.html` resource and renders iframe
3. **Tool Input**: Host sends `ui/notifications/tool-input` with arguments to iframe
4. **User Interaction**: User fills form and clicks Submit/Cancel
5. **Tool Response**: Form calls `app.callServerTool()` or sends message back
6. **Result**: Server returns user input or cancellation message

### Dependencies

- `@modelcontextprotocol/ext-apps` - Server helpers & UI App class

### Files to Create/Modify

- [ ] `package.json` - Add ext-apps dependency
- [ ] `src/tools/apps-user-input.ts` - New tool implementation
- [ ] `src/tools/index.ts` - Register new tool
- [ ] `src/ui/input-form.html` - HTML form UI (bundled inline)
- [ ] `src/ui/input-form.ts` - Form JavaScript (bundled inline)

## Implementation Tasks

### Phase 1: Setup & Dependencies

- [ ] Install `@modelcontextprotocol/ext-apps` package
- [ ] Update TypeScript config if needed for ext-apps types
- [ ] Verify build still works

### Phase 2: Tool Implementation

- [ ] Create `src/tools/apps-user-input.ts`
- [ ] Define tool schema with prompt/title parameters
- [ ] Register tool with `_meta.ui.resourceUri`
- [ ] Register UI resource handler for `ui://user-input/form.html`
- [ ] Implement tool handler that waits for form submission

### Phase 3: UI Implementation

- [ ] Create HTML form structure
- [ ] Add VS Code theme CSS variable support
- [ ] Implement App class connection
- [ ] Handle `ui/notifications/tool-input` for receiving arguments
- [ ] Implement submit handler → call server tool
- [ ] Implement cancel handler
- [ ] Add loading/disabled states

### Phase 4: Integration

- [ ] Export tool in `src/tools/index.ts`
- [ ] Add tool name constant
- [ ] Test with VS Code Insiders
- [ ] Verify theme integration (light/dark)

### Phase 5: Documentation & Polish

- [ ] Update README with new tool documentation
- [ ] Add usage examples
- [ ] Error handling improvements
- [ ] Timeout handling

## Testing Plan

1. **Unit**: Tool registration, resource handler
2. **Integration**: VS Code Insiders manual testing
3. **UI**: Form rendering, theme switching, submit/cancel flows
4. **Edge Cases**: Timeout, rapid submissions, special characters

## Open Questions

1. Should we support multi-line input (textarea)?
2. Should we support optional input validation?
3. Should form persist partial input on host context changes?

## References

- [MCP Apps Documentation](https://modelcontextprotocol.io/docs/extensions/apps)
- [SEP-1865 Specification](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/draft/apps.mdx)
- [ext-apps SDK](https://github.com/modelcontextprotocol/ext-apps)
- [VS Code MCP Docs](https://code.visualstudio.com/docs/copilot/chat/mcp-servers)
