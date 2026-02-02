# 001 - Inline UI User Input Tool

## Overview

Add a new user input tool that leverages the **MCP Apps protocol** to render an interactive HTML form directly within the chat interface. This provides a native, integrated experience compared to external Electron dialogs or the basic elicitation API.

## Status

✅ **Complete**

## Background

The MCP Apps protocol (SEP-1865) enables MCP servers to deliver interactive HTML UIs that render inline in chat interfaces. VS Code Insiders (and other compatible hosts like Claude Desktop) support this over stdio transport.

### Benefits over existing tools

| Feature | `user_input` (Electron) | `user_elicitation` | `inline_ui_user_input` (New) |
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
3. Provide multiline text input that auto-expands as user types
4. Support optional quick-action buttons (menu of predefined options)
5. When a button is clicked:
   - Return the selected option text to the agent
   - Disable further input (grey out input box)
   - Preserve visible content for chat history readability
6. Include Submit and Cancel buttons for free-text submission
7. Return user input to the calling tool
8. Handle submission, cancellation, and timeout gracefully

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
│  │  │  │ - Quick option buttons (optional)            │   │││
│  │  │  │ - Multiline auto-expanding textarea          │   │││
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
│  - inline_ui_user_input tool                                │
│  - ui://user-input/form.html resource                       │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Tool Call**: Agent calls `inline_ui_user_input` with `{ prompt, title?, options? }`
2. **UI Render**: Host fetches `ui://user-input/form.html` resource and renders iframe
3. **Tool Input**: Host sends `ui/notifications/tool-input` with arguments to iframe
4. **User Interaction**: 
   - User can click a quick-option button → immediately returns that option
   - Or user types free text and clicks Submit
   - Clicking button/submit disables further input, greys out form
5. **Tool Response**: Form sends result back via App class
6. **Result**: Server returns user input or selected option

### Dependencies

- `@modelcontextprotocol/ext-apps` - Server helpers & UI App class

### Files to Create/Modify

- [x] `package.json` - Add ext-apps dependency ✅ v1.0.1 installed
- [x] `src/tools/apps-user-input.ts` - New tool implementation
- [x] `src/tools/index.ts` - Register new tool
- [x] `src/ui/input-form.html` - HTML form UI
- [x] `README.md` - Updated with new tool documentation

## Implementation Tasks

### Phase 1: Setup & Dependencies ✅

- [x] Install `@modelcontextprotocol/ext-apps` package (v1.0.1)
- [x] Update TypeScript config if needed for ext-apps types (none needed)
- [x] Verify build still works

### Phase 2: Tool Implementation ✅

- [x] Create `src/tools/apps-user-input.ts`
- [x] Define tool schema with prompt/title/options parameters
- [x] Register tool with `_meta.ui.resourceUri`
- [x] Export UI resource config (handler to be integrated in Phase 4)
- [x] Implement tool handler (returns args for UI to use)

### Phase 3: UI Implementation ✅

- [x] Create HTML form structure with multiline textarea
- [x] Implement auto-expanding textarea behavior
- [x] Add optional quick-option buttons rendering
- [x] Add VS Code theme CSS variable support
- [x] Implement App class connection
- [x] Handle `ui/notifications/tool-input` for receiving arguments
- [x] Implement submit handler → return free text
- [x] Implement button click handler → return selected option
- [x] Implement cancel handler
- [x] Add disabled/greyed-out state after submission

### Phase 4: Integration

- [x] Export tool in `src/tools/index.ts`
- [x] Add tool name constant
- [x] Manual test with VS Code Insiders
- [x] Verify theme integration (light/dark)

### Phase 5: Documentation & Polish

- [x] Update README with new tool documentation
- [x] Add usage examples
- [x] Error handling improvements
- [x] Timeout handling

## Testing Plan

Manual testing with VS Code Insiders:

1. **Basic Flow**: Call tool with prompt only, enter text, submit
2. **With Options**: Call tool with options array, click button, verify return value
3. **Theme**: Toggle VS Code light/dark theme, verify form adapts
4. **Auto-expand**: Type long text, verify textarea grows
5. **Disabled State**: After submission, verify form is greyed but visible
6. **Cancel**: Click cancel, verify proper handling
7. **Edge Cases**: Empty input, special characters, very long text

## Open Questions

1. ~~Should we support multi-line input (textarea)?~~ → ✅ Yes, multiline with auto-expand
2. Should we support optional input validation?
3. Should form persist partial input on host context changes?
4. Maximum number of quick-option buttons to support?

## References

- [MCP Apps Documentation](https://modelcontextprotocol.io/docs/extensions/apps)
- [SEP-1865 Specification](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/draft/apps.mdx)
- [ext-apps SDK](https://github.com/modelcontextprotocol/ext-apps)
- [VS Code MCP Docs](https://code.visualstudio.com/docs/copilot/chat/mcp-servers)

---

## Devlog

### Extras added beyond original spec

This section documents additional work and changes made during implementation that weren't part of the original plan.

#### Build System Migration (22f7204)
- **Migrated from tsc to Vite build** - More robust bundling with better support for the MCP Apps SDK
- Enables proper handling of HTML/TypeScript UI assets

#### Two-Tool Blocking Pattern (68edf65)
- **Implemented new architecture using two tools instead of one**:
  - `inline_ui_user_input` - Renders the UI and returns immediately
  - `await_inline_ui_response` - Blocks waiting for user submission
  - `__internal__apps_submit` - Internal tool for UI to submit results (hidden from agent)
- This pattern was required because the MCP Apps protocol doesn't support direct tool result return from UI

#### UI Implementation in React (c7ab5c3)
- **Rewrote the input form in React** instead of plain HTML/JS
- Better component structure and state management
- Various UX improvements during the rewrite

#### Enhanced Button Styling (9a462e0)
- **Toggle input feature** - Option buttons can now show/hide the text input
- Improved button styling for better visual feedback

#### Inline MCP Apps Protocol (d2f2c38)
- Implemented the protocol inline without external imports for reliability
- Added `ui/update-model-context` support

#### Auto "Something else" Option (df81578)
- When options are provided, automatically adds a "Something else" option
- Allows users to provide free-text input even when presented with predefined options
- Documented in README

#### Internal Tool Naming (0f97d6b)
- Renamed `_apps_store_response` to `__internal__apps_submit` for clearer intent
- Prefixed with `__internal__` to indicate it's not meant for agent use

#### Default showInput Behavior (6f4f367)
- Fixed the input box to not show by default when options are provided and `showInput` is false
- Improved UX by only showing free text input when appropriate

#### localStorage State Persistence (2acd7a0)
- Implemented localStorage-based form completion state persistence
- Prevents form from being re-displayed on page refresh after submission
- Improves user experience in long-running conversations

#### PR Review Improvements (32b0a65)
- Added DOMPurify for XSS protection when rendering markdown prompts
- Fixed useHostStyles hook to handle undefined hostContext
- Improved documentation for await_apps_response tool
- Fixed keyboard shortcut docs (Enter to submit, Shift+Enter for new lines)
- Fixed memory leak on timeout (clean up pendingRequests map)
- Clarified vite emptyOutDir comment

#### Timeout Configuration (b3cf056)
- **Removed all default timeouts** - users can now cancel via stop button at any time
- Added `USER_INPUT_TIMEOUT_MINUTES` environment variable for global timeout configuration
- Removed timeout parameter from tool schemas (now only configurable globally)

#### Tool Renaming (c150034)
- **Renamed `user_apps_input` to `inline_ui_user_input`** for clearer intent
- **Renamed `await_apps_response` to `await_inline_ui_response`**
- Updated all documentation and variable names throughout codebase

#### Internal Submit Tool Rename
- **Renamed `__internal__apps_submit` to `__internal__submit_ui_response`** for clearer intent
- Updated tool definition, variable names, comments, and documentation
