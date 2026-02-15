# 003 - Split Buttons with Inline Edit

## Overview

Replace the current "Something else..." button with split-button controls on each option. Each option button gets a small "edit pen" icon appendage that allows users to combine a predefined option with free-text input. The "Something else..." button becomes "Other... ✏" (inline) or "Something else... ✏" (list layout).

## Status

🟡 **In Progress**

## Background

Currently, users can either pick a predefined option OR type free text via "Something else...". If they want to combine an option with additional context, they must open the text box, type, then click the option — but the UI doesn't clearly communicate this workflow. The split-button pattern makes the "option + text" flow explicit and discoverable, while also simplifying the restored state display.

## Requirements

### Functional Requirements

1. **Split button structure**: Each option button is split into two zones:
   - **Main zone**: The option label (clicking submits that option, same as today)
   - **Edit zone**: A small square at the trailing end with a pen/edit SVG icon

2. **Edit zone behaviour**:
   - Clicking the edit zone opens the text input area (same textarea as today)
   - The associated main zone shows a semi-active state (50% opacity background, full opacity white text)
   - Placeholder changes to "Add additional details..." when opened from an edit pen
   - If the user types text and then clicks the **main zone** of any option, the submission combines the option with the additional text
   - Clicking Submit button also submits as the associated option + text
   - If the user clicks the edit zone but enters no text, then clicks the main zone, it submits just the option (no edit zone highlight)

3. **"Other" / "Something else..." button**:
   - In **inline/wrap layout**: Shows as "Other... ✏" with pen icon
   - In **list/grid layout**: Shows as "Something else... ✏" full-width
   - Clicking it opens the text input area for pure free-text entry
   - Placeholder shows "Type your response..." when opened from this button
   - Submitting from this path uses the `submit` action (not `option`)

4. **Visual highlight rules** (active/selected state):
   - **Option only** (no text entered): Main zone fully highlighted, edit zone NOT highlighted
   - **Option + text**: Main zone semi-active (50% bg), edit zone fully highlighted
   - **Free text only** (via Other/Something else): The Other button highlighted
   - **Cancelled**: No highlights

5. **Restored state from localStorage** must match the same highlight rules:
   - `selectedOption` is set + `statusMessage` contains "with text:" → main semi-active + edit zone active
   - `selectedOption` is set + `statusMessage` does NOT contain "with text:" → main zone fully active only
   - `selectedOption` is null + `statusMessage` starts with "Submitted:" → Other button highlighted
   - `statusMessage` is "Cancelled" → no highlights

6. **Backwards compatibility**: No changes to the localStorage schema. The existing `{ submitted, statusMessage, selectedOption }` fields are sufficient to derive all highlight states.

### Non-Functional Requirements

1. The edit zone should be visually distinct but cohesive — a thin vertical separator between main and edit zones
2. The pen icon is an inline SVG using `currentColor` for theming
3. Split buttons work correctly in both wrap layout and list/grid layout
4. Keyboard accessibility: Tab moves between buttons; edit zone is a separate focusable element; split buttons use inset box-shadow for focus to avoid overlap artifacts
5. When options start with numbers or letters (e.g. "1.", "a)"), list layout left-aligns text instead of centering

## Technical Design

### Architecture

```
┌──────────────────────────────┐
│ Option Button (split)        │
│ ┌──────────────────┬───────┐ │
│ │   Option Label   │  ✏   │ │
│ │   (main zone)    │(edit) │ │
│ └──────────────────┴───────┘ │
└──────────────────────────────┘

Inline:  [ Other... ✏ ]
List:    [ Something else...                    ✏ ]
```

### Component Changes

The split button is a `<div>` wrapper containing two `<button>` elements styled to appear as a single cohesive button:

```tsx
<div className="split-button">
  <button className="split-main option-button" onClick={handleOptionClick}>
    {option}
  </button>
  <button className="split-edit option-button" onClick={() => toggleInputFromEdit(option)}>
    <EditIcon />
  </button>
</div>
```

### State Changes

- `inputSectionOpen` — controls textarea visibility (existing)
- `inputSource` — tracks which option's edit pen was clicked, or `'other'` for the Other button, or `null` when not active (new)
- On submit, both `inputSectionOpen` and `inputSource` are cleared to prevent stale highlight states
- `submittedWithText` — derived from `statusMessage` containing "with text:" for post-submit highlights

### Highlight State Derivation

From existing localStorage fields:

| `selectedOption` | `statusMessage` pattern | Main zone | Edit zone | Other btn |
|---|---|---|---|---|
| set | contains "with text:" | semi-active | active | — |
| set | no "with text:" | active | — | — |
| null | starts with "Submitted:" | — | — | active |
| any | "Cancelled" | — | — | — |

### Files to Create/Modify

- [x] `src/ui/App.tsx` - Split button rendering, state management, highlight logic
- [x] `src/ui/input-form.html` - CSS styles for split buttons (separator, edit zone, active states)

## Implementation Tasks

### Phase 1: CSS & Layout

- [x] Add `.split-button` wrapper styles (inline-flex, border-radius distribution)
- [x] Add `.split-main` styles (right border-radius removed, border-right none)
- [x] Add `.split-edit` styles (small fixed-width, left border-radius removed, subtle separator line)
- [x] Add `.active` and `.semi-active` variants for both zones independently
- [x] Ensure both layouts (wrap + grid/list) handle split buttons correctly
- [x] Style "Other" / "Something else..." button (icon-only inline, full-width in list)
- [x] Add inset box-shadow focus style for split buttons to prevent overlap artifacts

### Phase 2: Component Logic

- [x] Replace current option `<button>` elements with split-button structure
- [x] Wire main zone click → `handleOptionClick`
- [x] Wire edit zone click → `toggleInputFromEdit(option)` (per-option tracking)
- [x] Add `inputSource` state to track which edit pen or Other button opened the textarea
- [x] Replace "Something else..." button with "Other... ✏" / "Something else... ✏" (layout-dependent)
- [x] Submit button attributes to correct option when opened from edit pen
- [x] Clear `inputSectionOpen` and `inputSource` on all submit paths (option click, Submit button, cancel)

### Phase 3: Highlight Logic

- [x] Main zone: fully active when selected without text, semi-active when selected with text or edit pen active
- [x] Edit zone: active when that option's pen is open, or when selected+submitted with text
- [x] Other button: active when `inputSource === 'other'`, or when submitted with no selectedOption
- [x] ~~Highlight "Something else..." button when input opened from it~~ → Replaced with clear state management
- [x] Implement localStorage-restore highlight rules (same derivation, no schema change)
- [x] Dynamic placeholder: "Add additional details..." for edit pen, "Type your response..." for Other

### Phase 4: Polish & Testing

- [x] Test option-only selection → main zone highlighted, edit zone not
- [x] Test option + text via edit pen → main semi-active, edit active
- [x] Test free text via Other → Other button highlighted
- [x] Test cancel → no highlights
- [x] Test page reload restores correct highlight state for all scenarios
- [x] Test keyboard navigation (focus outlines work cleanly)
- [x] Test both wrap and list layouts
- [x] Test numbered options trigger left-alignment in list layout
- [x] Build and verify

## Testing Plan

1. **Manual Testing**: Exercise all submission paths and verify highlights
   - Pick option → main fully active
   - Open edit on option, type text, click option main → main semi-active + edit active
   - Open edit on option, type text, click Submit → main semi-active + edit active
   - Click Other, type text, submit → Other active
   - Click Other, type text, click main option → option highlighted, Other NOT highlighted
   - Cancel → nothing active
2. **Reload Testing**: For each scenario, reload the page and confirm localStorage-restored highlights match
3. **Layout Testing**: Test with 2-3 options (wrap layout) and 5+ long options (list layout)
4. **Left-align Testing**: Options starting with "1.", "a)", "A." etc. should left-align in list layout
5. **Edge Cases**: 
   - Open edit zone, type text, clear text, click main → should be option-only
   - Open Other, type text, click different option's main → that option highlighted with text

## Open Questions

1. ~~Should clicking the edit zone of a *different* option close the textarea if it was opened by another option's edit zone?~~ → Resolved: clicking a different option's edit zone switches `inputSource` to that option
2. ~~Should the pen icon be a Unicode character (✏️) or an inline SVG for visual consistency?~~ → Resolved: using inline SVG with `currentColor` stroke
3. ~~In list layout, should the edit zone be the same height as the main zone or smaller?~~ → Resolved: same height, part of the split button

## References

- Current implementation: `src/ui/App.tsx`
- localStorage schema: `{ submitted: boolean, statusMessage: string | null, selectedOption: string | null }`

---

## Devlog

*Document additional work, changes, and discoveries made during implementation that weren't part of the original plan. Update this section as you go.*

### Extras added beyond original spec

#### Semi-active state for option+text
Main zone uses 50% opacity background (`semi-active` class) while the edit zone is fully highlighted. This visually distinguishes "option + text" from "option only" submissions.

#### Per-option `inputSource` tracking
`inputSource` stores the actual option name (not just `'edit'`), so only that specific option's edit pen highlights. Prevents all edit pens highlighting when any one is clicked.

#### Layout-dependent Other button text
Shows "Other... ✏" in inline/wrap layout and "Something else... ✏" in list layout. Compact when space is limited, descriptive when full-width.

#### Numbered/lettered left-alignment
Auto-detects options starting with `\d[.)]` or `[a-zA-Z][.)]` and left-aligns text in list layout for better readability.

#### Inset focus for split buttons
Uses `box-shadow: inset 0 0 0 2px` instead of `outline` on split button halves to eliminate a visible sliver artifact at the split boundary.

#### State cleanup on all submit paths
`inputSectionOpen` and `inputSource` are cleared before `submitResult` on option click, Submit button, and cancel. Prevents stale "Other" highlight when submitting via a main option after opening from Other.

#### Edit pen semi-active on option-only selection
When an option is selected without additional text, the edit pen zone shows a 50% semi-active background to visually tie it to the selected option.

#### `showAdditionalFreeInputButton` (required boolean)
Renamed from `showOtherButton`. Controls whether the built-in "Other..."/"Something else..." button appears. Agents must explicitly decide based on whether the provided options already cover free-text input. The description guides agents to only set `false` when a specified option already serves as the free-text prompt.

#### `preExpandTextInputBox` (renamed from `showInput`)
Optional boolean controlling whether the text input box is pre-expanded on load. When `true`, the free input button is always shown regardless of `showAdditionalFreeInputButton`.

#### Agent instructions updated
Server instructions (`src/docs/instructions.md`) updated to document the new fields, edit pen behaviour, and guidance on when to set `showAdditionalFreeInputButton` to `true` vs `false`.

#### Numbered/lettered option guidance in tool description
The `options` field description now recommends prefixing with numbers or letters for lists of 4+ items, explaining the UI will auto left-align these in list layout.

### Development Log

| Date | Summary | Files Changed |
|---|---|---|
| 2025-02-15 | Full implementation of split buttons (phases 1-3) plus polish: focus artifact fix, semi-active state, per-option tracking, layout-dependent Other text, numbered left-alignment, state cleanup on all submit paths | `src/ui/App.tsx`, `src/ui/input-form.html` |
| 2025-02-15 | Edit pen zone shows semi-active (50% bg) highlight on option-only selections | `src/ui/App.tsx` |
| 2025-02-15 | Added `showAdditionalFreeInputButton` (required bool) and renamed `showInput` → `preExpandTextInputBox`. Updated tool schema, UI, and agent instructions | `src/tools/user-input-inline.ts`, `src/ui/App.tsx`, `src/docs/instructions.md` |
| 2025-02-15 | Added numbered/lettered option guidance to `options` field description in tool schema | `src/tools/user-input-inline.ts` |
