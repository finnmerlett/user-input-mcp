# 002 - Zod v4 Schema Definition and Input Validation

## Overview

Add Zod v4 for schema definition and input validation as part of the tools configuration and initial parsing. This will provide type-safe schema validation for tool inputs, ensuring data integrity and better error messages.

## Status

🟢 **Complete**

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

- [x] `package.json` - Add zod dependency
- [x] `src/tools/electron-user-input.ts` - Integrate Zod validation with co-located schema
- [x] `src/tools/elicitation.ts` - Integrate Zod validation with co-located schema
- [x] `src/tools/apps-user-input.ts` - Integrate Zod validation with co-located schemas
- [x] `tsconfig.json` - Verify Zod compatibility settings (no changes needed)

## Implementation Tasks

### Phase 1: Setup & Dependencies

- [x] Install `zod` (v4.3.6)
- [x] Use Zod v4 native `toJSONSchema()` function (no external package needed)
- [x] Verify build compatibility
- [x] Check for any TypeScript config updates needed

### Phase 2: Schema Definitions

- [x] Co-locate Zod schemas with tool implementations (instead of centralized file)
- [x] Define Zod schema for `user_input` tool in `electron-user-input.ts`
- [x] Define Zod schema for `user_elicitation` tool in `elicitation.ts`
- [x] Define Zod schemas for `user_apps_input`, `await_apps_response`, and `__internal__apps_submit` tools in `apps-user-input.ts`
- [x] Use `z.infer<>` for type inference (no duplicate interfaces)
- [x] Add descriptions to all schema fields

### Phase 3: Integration

- [x] Update `electron-user-input.ts` to use Zod validation
- [x] Update `elicitation.ts` to use Zod validation
- [x] Update `apps-user-input.ts` to use Zod validation
- [x] Convert manual validation to Zod schema validation
- [x] Update error messages to use Zod validation errors
- [x] Test all tools with valid and invalid inputs

### Phase 4: Testing & Validation

- [x] Test `user_input` with various inputs
- [x] Test `user_elicitation` with various inputs
- [x] Test `user_apps_input` with various inputs
- [x] Test `await_apps_response` with various inputs
- [x] Verify error messages are clear and actionable
- [x] Build and verify no breaking changes

### Phase 5: Documentation

- [x] Update README if needed (no changes needed - API remains the same)
- [x] Add code comments for schema definitions
- [x] Document validation patterns used

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

#### Zod v4 Native JSON Schema Support (849a7ae)
- **Discovery**: Zod v4 includes native `toJSONSchema()` function
- **Change**: Used Zod v4's built-in JSON schema generation instead of `zod-to-json-schema` package
- **Benefit**: Simpler dependency tree, better compatibility with Zod v4

#### Field Descriptions via `.describe()` Method (c23af74)
- **Added comprehensive descriptions** for all schema fields using Zod v4's `.describe()` method
- Descriptions are automatically included in the generated JSON schemas
- Improves developer experience and API documentation

#### Schema Co-location (current)
- **Changed approach**: Co-located schemas with tool implementations instead of centralized `schemas.ts` file
- Each tool file now contains its own schema definitions
- Uses `z.infer<>` for type inference instead of duplicate interface definitions
- Better maintainability and clearer code organization
