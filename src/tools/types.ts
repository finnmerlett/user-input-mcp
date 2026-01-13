import { ServerResult, Tool } from "@modelcontextprotocol/sdk/types.js";

export type ToolWithHandler = Tool & { 
  handler: (args: any) => Promise<ServerResult> | ServerResult
};