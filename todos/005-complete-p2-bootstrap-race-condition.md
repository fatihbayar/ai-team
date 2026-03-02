---
status: pending
priority: p2
issue_id: "005"
tags:
  - code-review
  - architecture
dependencies: []
---

# P2: Bootstrap Race Condition

## Problem Statement

`store` is only updated inside `start()`. During bootstrap, `store.has(threadTs)` stays false. If two users send messages in the same thread while the first bootstrap is running, both enter `bootstrapAndStart` and both run the Developer agent and `gh repo create`. One may succeed, one may fail, and behavior is unpredictable.

## Findings

- **Location:** `src/workflow/engine.ts` (`bootstrapAndStart`), `src/workflow/store.ts`
- `store.has(threadTs)` is never set during bootstrap
- No lock acquired before bootstrap runs

## Proposed Solutions

### Option A: Acquire Lock at Start of bootstrapAndStart (Recommended)
- Check `store.has(threadTs)` at the beginning of `bootstrapAndStart`
- Set `store.set(threadTs, { ...placeholderState, currentAgent: "bootstrap" })` before running Developer
- Use `try/finally` to remove from store after bootstrap (start will set it again)
- **Pros:** Prevents concurrent bootstrap. **Effort:** Small. **Risk:** Low.

### Option B: Document Only
- Document that concurrent bootstrap in same thread is undefined behavior
- **Cons:** Doesn't fix the race. **Effort:** Minimal. **Risk:** High for UX.

## Recommended Action

_(To be filled during triage)_

## Technical Details

- Affected files: `src/workflow/engine.ts`, `src/workflow/store.ts`
- Store schema may need a placeholder state for "bootstrap"

## Acceptance Criteria

- [ ] `bootstrapAndStart` acquires thread lock before running
- [ ] Second concurrent bootstrap receives "workflow already running" message

## Work Log

- _(Add dated entries as work progresses)_

## Resources

- Architecture agent report
