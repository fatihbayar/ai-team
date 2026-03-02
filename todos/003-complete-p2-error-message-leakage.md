---
status: pending
priority: p2
issue_id: "003"
tags:
  - code-review
  - security
dependencies: []
---

# P2: Error Message Leakage to Slack

## Problem Statement

Raw `(err as Error).message` is posted to Slack in multiple places. Errors may include file paths, stack traces, or env names. This leaks internal details to Slack users.

## Findings

- **Locations:** `src/slack/router.ts` (lines 61, 87), `src/workflow/engine.ts` (lines 118–119, 165–166, 207, 238, 239, 249, 352)
- Pattern: `postInThread(\`... ${(err as Error).message}\`)`

## Proposed Solutions

### Option A: Map to Safe User-Facing Messages (Recommended)
- Implement `toUserFacingError(err)` that logs full error server-side and returns generic message for Slack
- Allowlist safe error types (e.g., "Missing required env") with sanitized messages
- **Pros:** Prevents leakage. **Cons:** Less debugging info for users. **Effort:** Medium. **Risk:** Low.

### Option B: Strip Paths and Stack Traces
- Regex-strip paths and stack traces from messages before posting
- **Pros:** Preserves some error content. **Cons:** May still leak env names. **Effort:** Small. **Risk:** Medium.

## Recommended Action

_(To be filled during triage)_

## Technical Details

- Affected files: `src/slack/router.ts`, `src/workflow/engine.ts`
- Consider centralizing in a small `errors.ts` or similar

## Acceptance Criteria

- [ ] Full errors logged server-side only
- [ ] Slack messages use sanitized, user-safe text
- [ ] Known safe errors (e.g., config) have appropriate user-facing messages

## Work Log

- _(Add dated entries as work progresses)_

## Resources

- Security agent report
