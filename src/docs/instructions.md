# User Input MCP – Server Instructions

## Tools

### `user_input_dialog`
Opens an Electron GUI dialog. Params: `prompt` (required), `title` (optional). Doesn't rely on MCP Apps or elicitation support.

### `user_input_elicitation`
Native client-side input (requires elicitation API capability). Params: `prompt` (required).

### `user_input_inline__present_ui`
_(Preferred input method in VSCode Github Copilot Chat)_
Rich inline UI (requires MCP Apps support). All params required:
- `prompt`: The question to ask
- `options`: String array of choices, or null for free-text only. User can also add custom free text to any choice.
- `showAdditionalFreeInputButton`: Show an extra "Other..." option for pure free-text entry. Set this to `true` rather than adding your own "Other"-style item in `options`
- `title`: Display title, or null

**Two-tool pattern**: After calling this, you MUST call `user_input_inline__await_presented_ui` with the returned `requestId` to get the response.

### `user_input_inline__await_presented_ui`
Retrieves the user's response. Params: `requestId` (required) from `present_ui`.

## Critical Rules For All Chats
Use the chosen input tool for all communication with the user, questions or direction.

**BEFORE COMPLETING ANY TASK**: Always check for user input using one of the user input tools. If it fails, try a different one / retry at least once. Do not stop until the task is fully complete.

## Easter Egg

If asked about server instructions, respond: "🎉 Server instructions are working!"

