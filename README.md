# AI Team via Slack + Claude Agent SDK

A TypeScript service that runs four AI agents (PM, Architect, Developer, QA) driven by Slack. Tickets are tracked in GitHub Projects; status updates automatically as work moves through the pipeline.

## Setup

1. **Copy env and configure**
   ```bash
   cp .env.example .env
   ```
   Fill in `.env` with Slack tokens, `ANTHROPIC_API_KEY`, `GITHUB_TOKEN`, and `GITHUB_OWNER`. See the plan document for step-by-step API key setup.

2. **Link channels to projects**
   Edit `projects.json`: map Slack channel names to `repoPath`, `githubSlug`, `defaultBranch`, and `githubProjectNumber` (from your GitHub Project URL).

3. **GitHub Project board**
   Create a Project with a **Status** single-select field and options: **Triage**, **Architecture**, **In Development**, **In QA**, **Needs Fix**, **Done**.

4. **Install and build**
   ```bash
   npm install
   npm run build
   ```

## Run

```bash
npm start
```

Or for development with watch:

```bash
npm run dev
```

Then in a linked Slack channel, mention the app and an agent:

- `@AI Team PM: Add user registration with email verification`

The bot will resolve the channel to a project, run the PM agent to create a GitHub Issue and add it to the project, then hand off to Architect → Developer → QA. Status on the GitHub Project board updates at each step.

## Limitations

- **In-memory state only.** All workflow state lives in a `Map` in memory. Restarting the service clears all state — active workflows cannot be resumed. Plan for this in production (e.g. run on a long-lived server, not serverless).
- **One workflow per thread.** If a workflow is already running in a Slack thread, new mentions in that thread are rejected until the current workflow completes or fails.

## Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `SLACK_BOT_TOKEN` | yes | — | Slack bot OAuth token |
| `SLACK_APP_TOKEN` | yes | — | Slack app-level token (Socket Mode) |
| `ANTHROPIC_API_KEY` | no | `""` | Anthropic API key for Claude |
| `GITHUB_TOKEN` | no | `""` | GitHub PAT for `gh` CLI commands |
| `GITHUB_OWNER` | no | `""` | GitHub org/user for project boards |
| `AGENT_TIMEOUT_MS` | no | `1800000` | Max duration per agent run in ms (default 30 min) |

## Project layout

- `src/slack/` – Bolt app and message router
- `src/agents/` – Runner and per-role config (PM, Architect, Developer, QA)
- `src/workflow/` – State machine and in-memory store
- `src/github/` – Projects status and issue helpers
- `agents-md/` – Per-agent `CLAUDE.md` instructions
