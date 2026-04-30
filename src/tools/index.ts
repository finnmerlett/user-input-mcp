import { USER_INPUT_DIALOG_TOOL } from "./user-input-dialog.js";
import { USER_INPUT_ELICITATION_TOOL } from "./user-input-elicitation.js";
import { USER_INPUT_INLINE_TOOL, _SUBMIT_INLINE_RESPONSE_TOOL, AWAIT_INLINE_RESPONSE_TOOL } from "./user-input-inline.js";
import type { ToolWithHandler } from "./types.js";

export const TOOL_NAME = {
  USER_INPUT_DIALOG: 'user_input_dialog',
  USER_INPUT_ELICITATION: 'user_input_elicitation',
  USER_INPUT_INLINE: 'user_input_inline__present_ui',
  AWAIT_INLINE_RESPONSE: 'user_input_inline__await_presented_ui',
  _SUBMIT_INLINE_RESPONSE: '__internal_do_not_use__submit_inline',
} as const;

type ToolName = typeof TOOL_NAME[keyof typeof TOOL_NAME];

export const AVAILABLE_TOOLS: Record<ToolName, ToolWithHandler> = {
  [TOOL_NAME.USER_INPUT_DIALOG]: USER_INPUT_DIALOG_TOOL,
  [TOOL_NAME.USER_INPUT_ELICITATION]: USER_INPUT_ELICITATION_TOOL,
  [TOOL_NAME.USER_INPUT_INLINE]: USER_INPUT_INLINE_TOOL,
  [TOOL_NAME.AWAIT_INLINE_RESPONSE]: AWAIT_INLINE_RESPONSE_TOOL,
  [TOOL_NAME._SUBMIT_INLINE_RESPONSE]: _SUBMIT_INLINE_RESPONSE_TOOL,
}

export const TOOL_NAMES = Object.keys(AVAILABLE_TOOLS);

export const isValidToolName = (name: string): name is ToolName => TOOL_NAMES.includes(name);