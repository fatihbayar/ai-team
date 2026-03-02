---
status: pending
priority: p3
issue_id: "008"
tags:
  - code-review
  - quality
dependencies: []
---

# P3: Remove Unused Exports

## Problem Statement

Two exports are never used:
1. `statusColumnNames` in `config.ts` – `engine.ts` uses its own `STATUS_MAP`
2. `getCached` in `projects.ts` – exported but never imported anywhere

## Findings

- **Locations:** `src/config.ts` (lines 39–47), `src/github/projects.ts` (lines 74–76)
- Dead code increases maintenance surface

## Proposed Solutions

### Option A: Remove Both (Recommended)
- Delete `statusColumnNames` from config.ts
- Remove `getCached` or stop exporting it from projects.ts
- **Pros:** Cleaner codebase. **Effort:** Small. **Risk:** None if truly unused.

### Option B: Keep for Future Use
- Document intended use
- **Cons:** YAGNI. **Effort:** None. **Risk:** Low.

## Recommended Action

_(To be filled during triage)_

## Technical Details

- Affected files: `src/config.ts`, `src/github/projects.ts`
- ~12 lines removed

## Acceptance Criteria

- [ ] `statusColumnNames` removed from config
- [ ] `getCached` removed or un-exported
- [ ] No broken imports elsewhere

## Work Log

- _(Add dated entries as work progresses)_

## Resources

- Code simplicity agent report
