# 002 - Zod v4 Schema Definition and Input Validation

## Overview

Add Zod v4 for schema definition and input validation as part of the tools configuration and initial parsing. This will provide type-safe schema validation for tool inputs, ensuring data integrity and better error messages.

## Status

🟡 **In Progress**

## Background

Currently, the MCP server tools use manual validation with basic type checking (e.g., `typeof` checks). While functional, this approach:
- Lacks type safety at compile time
- Provides basic error messages
- Requires manual validation code for each tool
- Doesn't support complex validation patterns easily

Zod v4 provides:
- Runtime type validation with TypeScript inference
- Declarative schema definition
- Rich error messages
- Automatic type generation from schemas
- Better maintainability and consistency across tools

## Requirements

### Functional Requirements

1. Install Zod v4 as a dependency
2. Define Zod schemas for all existing tool inputs
3. Replace manual validation with Zod schema validation
4. Convert Zod schemas to JSON Schema for MCP's `inputSchema` field
5. Maintain backward compatibility with existing tool interfaces
6. Provide clear validation error messages to users

### Non-Functional Requirements

1. No breaking changes to existing tool APIs
2. Minimal performance overhead
3. Type safety improvements for development
4. Clear and actionable error messages

## Technical Design

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Tool Definition (e.g., apps-user-input.ts)                  │
│  ┌──────────────────────────────────────────────────────────┤
│  │ 1. Define Zod Schema                                     │
│  │    const schema = z.object({ ... })                      │
│  │                                                           │
│  │ 2. Infer TypeScript Type                                 │
│  │    type Args = z.infer<typeof schema>                    │
│  │                                                           │
│  │ 3. Convert to JSON Schema                                │
│  │    inputSchema: zodToJsonSchema(schema)                  │
│  │                                                           │
│  │ 4. Validate in Handler                                   │
│  │    const validated = schema.parse(args)                  │
│  └──────────────────────────────────────────────────────────┤
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Schema Definition**: Each tool defines its input schema using Zod
2. **Type Inference**: TypeScript types are automatically inferred from schemas
3. **JSON Schema Conversion**: Zod schemas are converted to JSON Schema for MCP protocol
4. **Runtime Validation**: Tool handlers validate inputs using Zod's `parse()` method
5. **Error Handling**: Validation errors are caught and formatted for user-friendly messages

### Dependencies

- `zod` (v4.x) - Schema validation library
- `zod-to-json-schema` - Convert Zod schemas to JSON Schema format for MCP

### Files to Create/Modify

- [ ] `package.json` - Add zod and zod-to-json-schema dependencies
- [ ] `src/tools/schemas.ts` - Define Zod schemas for all tools
- [ ] `src/tools/electron-user-input.ts` - Integrate Zod validation
- [ ] `src/tools/elicitation.ts` - Integrate Zod validation
- [ ] `src/tools/apps-user-input.ts` - Integrate Zod validation
- [ ] `src/tools/types.ts` - Update types to use Zod inference
- [ ] `tsconfig.json` - Verify Zod compatibility settings

## Implementation Tasks

### Phase 1: Setup & Dependencies

- [ ] Install `zod` (v4.x)
- [ ] Install `zod-to-json-schema`
- [ ] Verify build compatibility
- [ ] Check for any TypeScript config updates needed

### Phase 2: Schema Definitions

- [ ] Create `src/tools/schemas.ts`
- [ ] Define Zod schema for `user_input` tool
- [ ] Define Zod schema for `user_elicitation` tool
- [ ] Define Zod schema for `user_apps_input` tool
- [ ] Define Zod schema for `await_apps_response` tool
- [ ] Define Zod schema for `__internal__apps_submit` tool
- [ ] Export inferred types from schemas

### Phase 3: Integration

- [ ] Update `electron-user-input.ts` to use Zod validation
- [ ] Update `elicitation.ts` to use Zod validation
- [ ] Update `apps-user-input.ts` to use Zod validation
- [ ] Convert manual validation to Zod schema validation
- [ ] Update error messages to use Zod validation errors
- [ ] Test all tools with valid and invalid inputs

### Phase 4: Testing & Validation

- [ ] Test `user_input` with various inputs
- [ ] Test `user_elicitation` with various inputs
- [ ] Test `user_apps_input` with various inputs
- [ ] Test `await_apps_response` with various inputs
- [ ] Verify error messages are clear and actionable
- [ ] Build and verify no breaking changes

### Phase 5: Documentation

- [ ] Update README if needed
- [ ] Add code comments for schema definitions
- [ ] Document validation patterns used

## Testing Plan

1. **Unit Tests**: Validate each schema with valid and invalid inputs
   - Valid inputs should pass validation
   - Invalid inputs should produce clear error messages
   - Edge cases (undefined, null, wrong types)

2. **Integration Tests**: Test full tool flow with validation
   - Call tools with valid arguments
   - Call tools with invalid arguments
   - Verify error handling

3. **Manual Testing**: Exercise tools through MCP client
   - Test each tool with VS Code/Claude Desktop
   - Verify error messages appear correctly
   - Ensure no regression in functionality

## Open Questions

1. Should we add custom error messages for each field validation?
2. Should we create helper utilities for common validation patterns?
3. Do we need to add Zod schemas for internal types beyond tool inputs?

## References

- [Zod Documentation](https://zod.dev/)
- [zod-to-json-schema](https://github.com/StefanTerdell/zod-to-json-schema)
- [MCP Specification](https://modelcontextprotocol.io/docs/specification)

---

## Devlog

*Document additional work, changes, and discoveries made during implementation that weren't part of the original plan. Update this section as you go.*

### Extras added beyond original spec

<!-- Example format:
#### Feature/Change Name (commit-hash)
- **What was added/changed** - Brief description
- Any relevant implementation details
-->
