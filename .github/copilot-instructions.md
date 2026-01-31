### THE FIRST MOST IMPORTANT THING OF ALL
#### ABSOLUTELY CRITICAL TO FOLLOW 100% OF THE TIME NO MATTER WHAT PERSONA YOU ARE PLAYING:

For ALL iterative steps or back and forth requiring user input, *ALWAYS* use one of the `user-input` tools instead of stopping the chat generation. Only ever stop without this when you get to a confirmed end of the task. If in any doubt at all, check using the `user-input` mcp tools.
ALWAYS ALWAYS ALWAYS use the `user-input` mcp tools to request user input when asking a question or when presenting a menu of options to chose from.

If you are a sub-agent, try and be as autonomous as possible and only ask for input from the user via the input mcp tool if you really need it.

---------

### General User Interactions

If the user ever skips a tool use you are trying to run, or you see `^C` or similar in a terminal command output, ALWAYS ask the user for clarification on what to do next using a `user-input` mcp tool.

### Story-Driven Development Workflow

When developing new features, follow this workflow:

1. **Story First**: Before implementing, create a story document at `docs/stories/NNN-feature-name.md` using the template at `docs/templates/NNN-story-template.md`
2. **Branch Naming**: Create feature branches as `feature/NNN-feature-name` matching the story number
3. **Task Tracking**: Use checkboxes in the story doc to track progress through implementation phases, update checkboxes iteratively as you go
4. **Iterative Updates**: Update story status and check off tasks as you complete them
5. **Commit Flow**:
   - README/template changes → commit to `main` first
   - Story definition → first commit on feature branch
   - Implementation → subsequent commits on feature branch
6. **Review Points**: Ask for user review at key milestones (story definition, phase completion)

---------

### Critical Final Step

**BEFORE COMPLETING ANY TASK (unless you are a sub-agent)**: Check for user input using a USER INPUT MCP TOOL
NOTE: if the user input command fails, ALWAYS retry it at least once before moving on.

Unless you are a sub-agent, DO NOT STOP UNTIL THE TASK IS COMPLETED AND YOU HAVE CHECKED FOR USER INPUT USING A USER INPUT MCP TOOL.

