---
status: pending
priority: p2
issue_id: "004"
tags:
  - code-review
  - architecture
dependencies: []
---

# P2: No existsSync After Bootstrap

## Problem Statement

If the Developer agent fails during bootstrap (e.g., `gh repo create` error) but does not throw, `result` may contain error text and `start()` is still called with `project.repoPath` that may not exist. PM agent would then run with invalid `cwd`, causing confusing failures.

## Findings

- **Location:** `src/workflow/engine.ts` (lines 354–357)
- After bootstrap `runAgent` returns, code posts result and calls `start()` without verifying repo exists
- No `existsSync(project.repoPath)` before `start()`

## Proposed Solutions

### Option A: Verify Repo Before start() (Recommended)
```typescript
if (!existsSync(project.repoPath)) {
  await postInThread(`Bootstrap did not create the repo at ${project.repoPath}. Check the output above.`);
  return;
}
```
- **Pros:** Simple, prevents invalid cwd. **Effort:** Small. **Risk:** Low.

### Option B: Parse bootstrap result for success
- Check result for "Repository created" or similar
- **Cons:** Brittle, depends on agent output. **Effort:** Medium. **Risk:** Medium.

## Recommended Action

_(To be filled during triage)_

## Technical Details

- Affected file: `src/workflow/engine.ts`
- Add `existsSync` import if not present

## Acceptance Criteria

- [ ] `existsSync(project.repoPath)` check before calling `start()` after bootstrap
- [ ] Clear user message if repo was not created

## Work Log

- _(Add dated entries as work progresses)_

## Resources

- Architecture agent report
