---
status: pending
priority: p1
issue_id: "002"
tags:
  - code-review
  - security
dependencies: []
---

# P1: Path Traversal via channelName

## Problem Statement

`channelName` from Slack `conversations.info` is used directly in `repoPath: join(projectsDir, channelName)` and `githubSlug: \`${env.githubOwner}/${channelName}\``. Although Slack channel names are restricted to `[a-z0-9_-]`, there is no explicit validation. Empty `channelName` yields `repoPath === projectsDir`. If the API ever returns unexpected values, writes could occur outside the intended directory.

**Why it matters:** Potential arbitrary filesystem access or accidental use of projects root as repo.

## Findings

- **Location:** `src/config.ts` (lines 29–36), `src/slack/router.ts` (line 15)
- No validation of `channelName` before `buildProjectConfig`
- `join(projectsDir, "")` yields `projectsDir`
- No `resolve` + `startsWith` check to ensure path stays under `projectsDir`

## Proposed Solutions

### Option A: Validate channelName + Path Check (Recommended)
- Add regex for Slack channel name: `^[a-z0-9][a-z0-9_-]{0,79}$`
- Use `resolve()` and verify `repoPath.startsWith(resolve(projectsDir) + "/")` or equals `projectsDir`
- Reject empty/invalid channel names in router before calling `buildProjectConfig`
- **Pros:** Defensive, future-proof. **Cons:** Slightly more code. **Effort:** Small. **Risk:** Low.

### Option B: Validate Only in buildProjectConfig
- Throw from `buildProjectConfig` on invalid input; router catches and posts user-friendly message
- **Pros:** Single validation point. **Effort:** Small. **Risk:** Low.

## Recommended Action

_(To be filled during triage)_

## Technical Details

- Affected files: `src/config.ts`, `src/slack/router.ts`
- No database changes

## Acceptance Criteria

- [ ] `channelName` validated against Slack naming rules
- [ ] Empty `channelName` rejected early in router
- [ ] Resolved `repoPath` verified to stay under `projectsDir`

## Work Log

- _(Add dated entries as work progresses)_

## Resources

- Security agent report
- Slack channel naming: https://api.slack.com/docs/channel-naming
