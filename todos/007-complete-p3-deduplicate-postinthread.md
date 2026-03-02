---
status: pending
priority: p3
issue_id: "007"
tags:
  - code-review
  - quality
dependencies: []
---

# P3: Duplicate postInThread in Router

## Problem Statement

The same `postInThread` helper is defined twice in `registerRouter`: once inside the bootstrap branch and once in the normal flow. This is unnecessary duplication.

## Findings

- **Location:** `src/slack/router.ts` (lines 53–59, 76–82)
- Identical implementation in both branches
- Define once after resolving `channelName`, before the `if (!existsSync(...))` branch

## Proposed Solutions

### Option A: Define Once at Top (Recommended)
- Move `postInThread` definition to after `channelName` resolution and before any branching
- **Pros:** Single source of truth. **Effort:** Small. **Risk:** None.

## Recommended Action

_(To be filled during triage)_

## Technical Details

- Affected file: `src/slack/router.ts`
- ~7 lines removed

## Acceptance Criteria

- [ ] Single `postInThread` definition used in both bootstrap and normal paths

## Work Log

- _(Add dated entries as work progresses)_

## Resources

- Code simplicity agent report
