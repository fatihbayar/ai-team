---
status: pending
priority: p3
issue_id: "009"
tags:
  - code-review
  - agent-native
dependencies: []
---

# P3: No Alternative Entry Point for Agents

## Problem Statement

All workflow triggers go through Slack. There is no HTTP API, MCP server, or CLI for agents to trigger the same workflows. Automation is Slack-only.

## Findings

- **Location:** `src/index.ts`, overall architecture
- `start()` and `bootstrapAndStart()` accept `postInThread` and synthetic IDs – engine is reusable
- No API/CLI/MCP exposes these flows
- Project config is tied to channel name; no way for agents to pass explicit `repoName` or `ProjectConfig`

## Proposed Solutions

### Option A: Add CLI
- `npx ai-team start --project-number 2 --task "Add auth" --repo-name my-app [--bootstrap]`
- **Pros:** Agents can invoke via subprocess. **Effort:** Medium. **Risk:** Low.

### Option B: Add HTTP API
- POST `/workflow` with JSON body; progress via SSE or webhooks
- **Pros:** Integration-friendly. **Cons:** More infra. **Effort:** Large. **Risk:** Medium.

### Option C: Add MCP Tools
- `ai_team_start_workflow`, `ai_team_bootstrap` for MCP-enabled agents
- **Pros:** Native agent integration. **Effort:** Medium. **Risk:** Low.

### Option D: Defer
- Document as future enhancement if agent-native usage is not a current requirement
- **Effort:** None. **Risk:** None.

## Recommended Action

_(To be filled during triage)_

## Technical Details

- Engine is already decoupled; `PostInThreadFn` can be no-op or logger
- Would need `buildProjectConfig` to accept explicit `repoName` or overrides

## Acceptance Criteria

- [ ] Decide on entry point (CLI/API/MCP) based on requirements
- [ ] If implementing: document params in machine-readable format (OpenAPI, MCP schema)

## Work Log

- _(Add dated entries as work progresses)_

## Resources

- Agent-native reviewer report
