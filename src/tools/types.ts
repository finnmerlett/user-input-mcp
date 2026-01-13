import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerNotification, ServerRequest, ServerResult, Tool } from "@modelcontextprotocol/sdk/types.js";

export type ToolWithHandler = Tool & { 
  handler: (args: any, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => Promise<ServerResult> | ServerResult
};