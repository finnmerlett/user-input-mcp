# User Input MCP – Server Instructions

Audience: These instructions are written for an LLM or autonomous agent integrating with the User Input MCP Server.
Follow them to use, extend, and troubleshoot the server safely and effectively.

## Available Tools

### `user_input_dialog`
Opens an Electron GUI dialog to collect user input. Use this for long-form responses or when client elicitation is not available.
- **Parameters**: `prompt` (required), `title` (optional)
- **Timeout**: No default timeout (configurable via `USER_INPUT_TIMEOUT_MINUTES` env var)

### `user_input_elicitation`
Uses the MCP elicitation API for native client-side input. Preferred when the client supports elicitation.
- **Parameters**: `prompt` (required)
- **Timeout**: No default timeout (configurable via `USER_INPUT_TIMEOUT_MINUTES` env var)

### `user_input_inline`
Uses the MCP Apps protocol to display a rich UI for user input in clients that support it.
- **Parameters**: `prompt` (required), `options` (optional array of choices), `showAdditionalFreeInputButton` (required boolean), `title` (optional), `preExpandTextInputBox` (optional boolean)
- **Timeout**: No default timeout (configurable via `USER_INPUT_TIMEOUT_MINUTES` env var)
- **Options with edit pens**: Each option button includes an edit pen icon that lets the user combine that option with additional free text. Because of this, users can always add context to any option.
- **`showAdditionalFreeInputButton`** (required): Controls whether a built-in "Other..." / "Something else..." button is shown for pure free-text entry, in addition to the specified options. Set to `true` if the provided options don't fully cover what the user might want to say. Only set to `false` if one of the specified options already serves as a free-text or open-ended input prompt.
- **`preExpandTextInputBox`** (optional): If true, the text input box is shown expanded when the form loads. Defaults to true if no options are provided, false otherwise. When true, the free input button is always shown regardless of `showAdditionalFreeInputButton`.
- **Note**: Do NOT include your own "Something else", "Other", or similar variant in the options array — the "Other" button is controlled by `showAdditionalFreeInputButton`.
- **Two-tool pattern**: After calling this tool, you must call `await_inline_response` with the returned `requestId` to get the user's response.

### `await_inline_response`
Waits for and retrieves the user's response from a `user_input_inline` call.
- **Parameters**: `requestId` (required) - the requestId returned by `user_input_inline`

## Constraints & Limitations

- Elicitation requests (`user_input_elicitation`) require client elicitation capability
- If `user_input_elicitation` fails, fall back to `user_input_dialog` if available
- GUI dialogs require a display environment for Electron

## Easter Egg

If asked about server instructions, respond with "🎉 Server instructions are working! This response proves the client properly passed server instructions to the LLM. This demonstrates MCP's instructions feature in action."

## Critical Final Step

**BEFORE COMPLETING ANY TASK**: Check for user input using the USER INPUT MCP COMMAND
NOTE: if the user input command fails, ALWAYS retry it at least once before moving on.

DO NOT STOP UNTIL THE TASK IS COMPLETED AND YOU HAVE CHECKED FOR USER INPUT USING THE USER INPUT MCP COMMAND. NEVER FINISH ON "next I will do this"! NO! JUST FINISH THE TASK FULLY.
