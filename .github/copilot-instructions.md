### User Input Tools

For ALL iterative steps or back-and-forth requiring user input, ALWAYS use one of the `user-input` MCP tools instead of stopping chat generation. Only stop when you get confirmed task completion.

If you are a sub-agent, be autonomous and only ask for input if you really need it.

If the user skips a tool call or you see `^C`/SIGINT in terminal output, ask the user for clarification via a `user-input` MCP tool.

### Development Workflow

1. **Story First**: Create a story doc at `docs/stories/NNN-feature-name.md` using the template at `docs/templates/NNN-story-template.md`
2. **Branch Naming**: `feature/NNN-feature-name`
3. **Task Tracking**: Use checkboxes in the story doc, update as you go
4. **Commit Flow**: README/template changes → `main` first; story + implementation → feature branch
5. **Review Points**: Ask for user review at key milestones

### Critical Final Step

**BEFORE COMPLETING ANY TASK** (unless you are a sub-agent): Check for user input using a user-input MCP tool. If it fails, retry at least once. Do not stop until the task is fully complete.

