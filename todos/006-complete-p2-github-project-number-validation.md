---
status: pending
priority: p2
issue_id: "006"
tags:
  - code-review
  - security
dependencies: []
---

# P2: No Bounds on githubProjectNumber

## Problem Statement

`parseInt(projectNumberMatch[1], 10)` accepts any numeric string. Very large values can become `Infinity` or cause odd behavior in the GitHub API. GitHub project numbers are typically small integers.

## Findings

- **Location:** `src/slack/router.ts` (lines 34–35)
- No range check after parseInt
- Empty channelName edge case (see 002 for path traversal)

## Proposed Solutions

### Option A: Range Check (Recommended)
```typescript
const parsed = parseInt(projectNumberMatch[1], 10);
if (!Number.isFinite(parsed) || parsed < 1 || parsed > 999999999) {
  await client.chat.postMessage({ channel: channelId, thread_ts: threadTs, text: "Invalid githubProjectNumber. Use a number between 1 and 999999999." });
  return;
}
const githubProjectNumber = parsed;
```
- **Pros:** Simple. **Effort:** Small. **Risk:** Low.

## Recommended Action

_(To be filled during triage)_

## Technical Details

- Affected file: `src/slack/router.ts`

## Acceptance Criteria

- [ ] Validate `githubProjectNumber` is finite and in reasonable range (e.g., 1–999999999)

## Work Log

- _(Add dated entries as work progresses)_

## Resources

- Security agent report
