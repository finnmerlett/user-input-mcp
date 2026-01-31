import { USER_INPUT_TOOL } from "./electron-user-input.js";
import { USER_ELICITATION_TOOL } from "./elicitation.js";
import { USER_APPS_INPUT_TOOL, _APPS_SUBMIT_TOOL, AWAIT_APPS_RESPONSE_TOOL } from "./apps-user-input.js";
import type { ToolWithHandler } from "./types.js";

export const TOOL_NAME = {
  USER_INPUT: 'user_input',
  USER_ELICITATION: 'user_elicitation',
  USER_APPS_INPUT: 'user_apps_input',
  AWAIT_APPS_RESPONSE: 'await_apps_response',
  _APPS_SUBMIT: '__internal__apps_submit',
} as const;

type ToolName = typeof TOOL_NAME[keyof typeof TOOL_NAME];

export const AVAILABLE_TOOLS: Record<ToolName, ToolWithHandler> = {
  [TOOL_NAME.USER_INPUT]: USER_INPUT_TOOL,
  [TOOL_NAME.USER_ELICITATION]: USER_ELICITATION_TOOL,
  [TOOL_NAME.USER_APPS_INPUT]: USER_APPS_INPUT_TOOL,
  [TOOL_NAME.AWAIT_APPS_RESPONSE]: AWAIT_APPS_RESPONSE_TOOL,
  [TOOL_NAME._APPS_SUBMIT]: _APPS_SUBMIT_TOOL,
}

export const TOOL_NAMES = Object.keys(AVAILABLE_TOOLS);

export const isValidToolName = (name: string): name is ToolName => TOOL_NAMES.includes(name);