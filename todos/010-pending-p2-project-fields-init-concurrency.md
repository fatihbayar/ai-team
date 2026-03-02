---
status: pending
priority: p2
issue_id: "010"
tags:
  - code-review
  - architecture
dependencies: []
---

# P2: ensureProjectFieldsInitialized Concurrent Init

## Problem Statement

Two workflows for the same `projectNumber` can both see `cache.has(projectNumber) === false` and both call `initProjectFields`. Result: duplicate `gh` calls. No cache corruption (synchronous), but wasteful.

## Findings

- **Location:** `src/github/projects.ts` (lines 76–80)
- `ensureProjectFieldsInitialized` is synchronous; no in-flight deduplication
- Concurrent workflows for same project → 2x `gh project view` + `gh project field-list`

## Proposed Solutions

### Option A: In-Flight Deduplication
- Use `Map<number, Promise<void>>` for in-flight inits
- First caller creates promise; others await it
- **Pros:** Prevents duplicate gh calls. **Cons:** Requires making init async. **Effort:** Medium. **Risk:** Low.

### Option B: Accept Duplication
- Document that concurrent first-use may double-init
- **Pros:** No change. **Cons:** Extra network calls. **Effort:** None. **Risk:** Low.

## Recommended Action

_(To be filled during triage)_

## Technical Details

- Affected file: `src/github/projects.ts`
- `initProjectFields` is currently sync; would need `initProjectFieldsAsync` or wrap in Promise

## Acceptance Criteria

- [ ] If implementing Option A: concurrent first-use does not duplicate `gh` calls
- [ ] If Option B: document behavior

## Work Log

- _(Add dated entries as work progresses)_

## Resources

- Architecture agent report
