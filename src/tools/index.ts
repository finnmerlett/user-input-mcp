import { USER_INPUT_TOOL } from "./electron-user-input.js";
import { USER_ELICITATION_TOOL } from "./elicitation.js";
import { INLINE_UI_USER_INPUT_TOOL, _SUBMIT_UI_RESPONSE_TOOL, AWAIT_INLINE_UI_RESPONSE_TOOL } from "./apps-user-input.js";
import type { ToolWithHandler } from "./types.js";

export const TOOL_NAME = {
  USER_INPUT: 'user_input',
  USER_ELICITATION: 'user_elicitation',
  INLINE_UI_USER_INPUT: 'inline_ui_user_input',
  AWAIT_INLINE_UI_RESPONSE: 'await_inline_ui_response',
  _SUBMIT_UI_RESPONSE: '__internal__submit_ui_response',
} as const;

type ToolName = typeof TOOL_NAME[keyof typeof TOOL_NAME];

export const AVAILABLE_TOOLS: Record<ToolName, ToolWithHandler> = {
  [TOOL_NAME.USER_INPUT]: USER_INPUT_TOOL,
  [TOOL_NAME.USER_ELICITATION]: USER_ELICITATION_TOOL,
  [TOOL_NAME.INLINE_UI_USER_INPUT]: INLINE_UI_USER_INPUT_TOOL,
  [TOOL_NAME.AWAIT_INLINE_UI_RESPONSE]: AWAIT_INLINE_UI_RESPONSE_TOOL,
  [TOOL_NAME._SUBMIT_UI_RESPONSE]: _SUBMIT_UI_RESPONSE_TOOL,
}

export const TOOL_NAMES = Object.keys(AVAILABLE_TOOLS);

export const isValidToolName = (name: string): name is ToolName => TOOL_NAMES.includes(name);