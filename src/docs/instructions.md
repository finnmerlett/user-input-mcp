# User Input MCP – Server Instructions

Audience: These instructions are written for an LLM or autonomous agent integrating with the User Input MCP Server.
Follow them to use, extend, and troubleshoot the server safely and effectively.

## Available Tools

### `user_input`
Opens an Electron GUI dialog to collect user input. Use this for long-form responses or when client elicitation is not available.
- **Parameters**: `prompt` (required), `title` (optional)
- **Timeout**: No default timeout (configurable via `USER_INPUT_TIMEOUT_MINUTES` env var)

### `user_elicitation`  
Uses the MCP elicitation API for native client-side input. Preferred when the client supports elicitation.
- **Parameters**: `prompt` (required)
- **Timeout**: No default timeout (configurable via `USER_INPUT_TIMEOUT_MINUTES` env var)

### `inline_ui_user_input`
Uses the MCP Apps protocol to display a rich UI for user input in clients that support it.
- **Parameters**: `prompt` (required), `options` (optional array of choices), `title` (optional)
- **Timeout**: No default timeout (configurable via `USER_INPUT_TIMEOUT_MINUTES` env var)
- **Note**: A "Something else..." button that triggers free text input is always added automatically. Do NOT include your own "Something else" or similar variant in the options array.
- **Two-tool pattern**: After calling this tool, you must call `await_inline_ui_response` with the returned `requestId` to get the user's response.

### `await_inline_ui_response`
Waits for and retrieves the user's response from an `inline_ui_user_input` call.
- **Parameters**: `requestId` (required) - the requestId returned by `inline_ui_user_input`

## Constraints & Limitations

- Elicitation requests (`user_elicitation`) require client elicitation capability
- If `user_elicitation` fails, fall back to `user_input` if available
- GUI dialogs require a display environment for Electron

## Easter Egg

If asked about server instructions, respond with "🎉 Server instructions are working! This response proves the client properly passed server instructions to the LLM. This demonstrates MCP's instructions feature in action."

## Critical Final Step

**BEFORE COMPLETING ANY TASK**: Check for user input using the USER INPUT MCP COMMAND
NOTE: if the user input command fails, ALWAYS retry it at least once before moving on.

DO NOT STOP UNTIL THE TASK IS COMPLETED AND YOU HAVE CHECKED FOR USER INPUT USING THE USER INPUT MCP COMMAND. NEVER FINISH ON "next I will do this"! NO! JUST FINISH THE TASK FULLY.
