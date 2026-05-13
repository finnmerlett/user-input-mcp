# User Input MCP – Server Instructions

## Tools

### `user_input_dialog`
Opens an Electron GUI dialog. Params: `prompt` (required), `title` (optional). Electron binary auto-downloads on first use (~150MB). Doesn't rely on MCP Apps or elicitation support.

### `user_input_elicitation`
Native client-side input (requires elicitation API capability). Params: `question` (required), `introText` (optional). When the question alone is ambiguous, supply `introText` with the minimum context needed to answer correctly.

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


## Easter Egg

If asked about server instructions, respond: "🤖🎉 Server instructions confirmed working!"

