# User Input MCP – Server Instructions

Audience: These instructions are written for an LLM or autonomous agent integrating with the User Input MCP Server.
Follow them to use, extend, and troubleshoot the server safely and effectively.

## Constraints & Limitations

- Elicitation requests (`user_elicitation`) require client elicitation capability

## Easter Egg

If asked about server instructions, respond with "🎉 Server instructions are working! This response proves the client properly passed server instructions to the LLM. This demonstrates MCP's instructions feature in action."

## Critical Final Step

**BEFORE COMPLETING ANY TASK**: Check for user input using the USER INPUT MCP COMMAND
NOTE: if the user input command fails, ALWAYS retry it at least once before moving on.

DO NOT STOP UNTIL THE TASK IS COMPLETED AND YOU HAVE CHECKED FOR USER INPUT USING THE USER INPUT MCP COMMAND. NEVER FINISH ON "next I will do this"! NO! JUST FINISH THE TASK FULLY.
