import { existsSync } from "fs";
import * as pmAgent from "../agents/pm.js";
import * as architectAgent from "../agents/architect.js";
import * as developerAgent from "../agents/developer.js";
import * as qaAgent from "../agents/qa.js";
import { runAgent } from "../agents/runner.js";
import { env, agentTimeoutMs, projectsDir } from "../config.js";
import { ensureProjectFieldsInitialized, updateProjectStatus } from "../github/projects.js";
import { addIssueToProjectAndGetItemId, getProjectItemIdByIssue } from "../github/issues.js";
import * as store from "./store.js";
import type { AgentRole, ProjectConfig, WorkflowState } from "./types.js";

const bootstrapLocks = new Set<string>();

const PIPELINE: AgentRole[] = ["pm", "architect", "developer", "qa"];

const STATUS_MAP: Record<AgentRole, string> = {
  pm: "Triage",
  architect: "Architecture",
  developer: "In Development",
  qa: "In QA",
};

export type PostInThreadFn = (text: string) => Promise<void>;

function getAgentConfig(role: AgentRole): { allowedTools: string[] } {
  switch (role) {
    case "pm":
      return pmAgent;
    case "architect":
      return architectAgent;
    case "developer":
      return developerAgent;
    case "qa":
      return qaAgent;
  }
}

function parseIssueNumberFromOutput(output: string, githubSlug: string): number | null {
  const slugEscaped = githubSlug.replace("/", "\\/");
  const patterns = [
    new RegExp(`${slugEscaped}#(\\d+)`, "i"),
    /#(\d+)/,
    /issues\/(\d+)/i,
    /(?:created|issue)\s*[:#]\s*(?:\S+)?#?(\d+)/i,
  ];
  for (const re of patterns) {
    const m = output.match(re);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

function escapeSlackMrkdwn(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function parsePrUrlFromOutput(output: string): string | null {
  const m = output.match(/https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+/);
  return m ? m[0] : null;
}

function parsePrNumberFromUrl(prUrl: string): number | null {
  const m = prUrl.match(/\/pull\/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function looksLikeQaApproval(output: string): boolean {
  return output.includes("[QA_APPROVED]");
}

const PROJECT_ITEM_RESOLVE_RETRIES = 5;
const PROJECT_ITEM_RESOLVE_DELAY_MS = 2000;

async function resolveProjectItemIdWithRetry(
  owner: string,
  projectNumber: number,
  repo: string,
  issueNumber: number
): Promise<string | null> {
  try {
    return addIssueToProjectAndGetItemId(owner, projectNumber, repo, issueNumber);
  } catch {
    // PM may have already added the issue; list can lag
  }
  const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
  for (let i = 0; i < PROJECT_ITEM_RESOLVE_RETRIES; i++) {
    const itemId = getProjectItemIdByIssue(owner, projectNumber, repo, issueNumber);
    if (itemId) return itemId;
    if (i < PROJECT_ITEM_RESOLVE_RETRIES - 1) await delay(PROJECT_ITEM_RESOLVE_DELAY_MS);
  }
  return null;
}

export async function start(
  channelId: string,
  threadTs: string,
  agentName: string,
  task: string,
  project: ProjectConfig,
  postInThread: PostInThreadFn
): Promise<void> {
  const role = agentName.toLowerCase().startsWith("pm")
    ? "pm"
    : agentName.toLowerCase().startsWith("arch")
      ? "architect"
      : agentName.toLowerCase().startsWith("dev")
        ? "developer"
        : agentName.toLowerCase().startsWith("qa")
          ? "qa"
          : "pm";

  if (store.has(threadTs) || bootstrapLocks.has(threadTs)) {
    await postInThread("A workflow is already running in this thread. Please wait for it to finish.");
    return;
  }

  if (env.githubOwner) {
    try {
      ensureProjectFieldsInitialized(env.githubOwner, project.githubProjectNumber);
    } catch (e) {
      console.error("Could not init project status fields:", e);
      await postInThread("_Could not initialize project status fields. Status updates may fail._");
    }
  }

  const state: WorkflowState = {
    channelId,
    threadTs,
    project,
    currentAgent: role,
    projectItemId: null,
    issueNumber: null,
    prUrl: null,
    ticketBody: null,
    solutionDoc: null,
    createdAt: Date.now(),
  };
  store.set(threadTs, state);

  if (role !== "pm") {
    await postInThread(
      `_Starting directly at ${role}. No upstream context from previous agents — the ${role} agent will work only with your message._`
    );
  }

  const initialTask =
    role === "pm" && env.githubOwner
      ? `${task}\n\nAfter creating the issue, add it to the GitHub Project board: gh project item-add ${project.githubProjectNumber} --owner ${env.githubOwner} --url <issue-url>.`
      : task;

  try {
    await runAgentForState(state, initialTask, postInThread);
  } finally {
    store.remove(threadTs);
  }
}

async function runAgentForState(
  state: WorkflowState,
  task: string,
  postInThread: PostInThreadFn
): Promise<void> {
  const { currentAgent, project } = state;
  const config = getAgentConfig(currentAgent);

  if (state.projectItemId && currentAgent !== "pm") {
    try {
      updateProjectStatus(project.githubProjectNumber, state.projectItemId, STATUS_MAP[currentAgent]);
    } catch (e) {
      console.error(`Could not update project status to ${STATUS_MAP[currentAgent]}:`, e);
      await postInThread(`_Could not update project status to ${STATUS_MAP[currentAgent]}._`);
    }
  }

  await postInThread(`_Running ${currentAgent} agent..._`);

  const result = await Promise.race([
    runAgent({
      role: currentAgent,
      task,
      cwd: project.repoPath,
      allowedTools: config.allowedTools,
    }),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Agent ${currentAgent} timed out after ${Math.round(agentTimeoutMs / 60000)} minutes`)),
        agentTimeoutMs,
      )
    ),
  ]);

  await postInThread(escapeSlackMrkdwn(result));

  if (currentAgent === "pm") {
    const issueNumber = parseIssueNumberFromOutput(result, project.githubSlug);
    if (issueNumber !== null) {
      state.issueNumber = issueNumber;
      state.ticketBody = result;
      if (env.githubOwner && state.projectItemId === null) {
        try {
          const itemId = await resolveProjectItemIdWithRetry(
            env.githubOwner,
            project.githubProjectNumber,
            project.githubSlug,
            issueNumber
          );
          if (itemId) {
            state.projectItemId = itemId;
            updateProjectStatus(project.githubProjectNumber, itemId, "Triage");
          }
        } catch (e) {
          console.warn(`Could not resolve project item for issue #${issueNumber}:`, (e as Error).message);
        }
      }
    }
  } else if (currentAgent === "architect") {
    state.solutionDoc = result;
  } else if (currentAgent === "developer") {
    const prUrl = parsePrUrlFromOutput(result);
    if (prUrl) state.prUrl = prUrl;
  }

  if (currentAgent === "developer") {
    const nextIdx = PIPELINE.indexOf(currentAgent) + 1;
    const nextAgent = PIPELINE[nextIdx];
    if (!state.prUrl && nextAgent === "qa") {
      await postInThread("_No PR URL was found. Re-triggering Developer to create and push a PR._");
      state.currentAgent = "developer";
      const devTask =
        `You must create a Pull Request and output its URL. Steps:\n` +
        `1. Ensure your branch is pushed: git push -u origin <branch-name>\n` +
        `2. Create the PR: gh pr create --repo ${project.githubSlug} --base ${project.defaultBranch} --title "<from ticket>" --body "Closes #${state.issueNumber ?? "N"}"\n` +
        `3. Output the PR URL on its own line (e.g. https://github.com/${project.githubSlug}/pull/1) so the orchestrator can hand off to QA.`;
      await runAgentForState(state, devTask, postInThread);
      return;
    }
  }

  if (currentAgent === "qa") {
    if (looksLikeQaApproval(result)) {
      if (state.projectItemId) {
        try {
          updateProjectStatus(project.githubProjectNumber, state.projectItemId, "Done");
        } catch (e) {
          console.error("Could not update project status to Done:", e);
          await postInThread("_Could not update project status to Done._");
        }
      }
      await postInThread("_Workflow complete. QA approved._");
      return;
    }
    state.currentAgent = "developer";
    if (state.projectItemId) {
      try {
        updateProjectStatus(project.githubProjectNumber, state.projectItemId, "Needs Fix");
      } catch (e) {
        console.error("Could not set status to Needs Fix:", e);
        await postInThread("_Could not set status to Needs Fix._");
      }
    }
    await postInThread("_Re-triggering Developer with QA feedback._");
    const devTask = `QA found issues. Please fix and push. Feedback:\n\n${result}\n\nThen the workflow will run QA again.`;
    await runAgentForState(state, devTask, postInThread);
    return;
  }

  const nextIdx = PIPELINE.indexOf(currentAgent) + 1;
  if (nextIdx >= PIPELINE.length) return;

  const nextAgent = PIPELINE[nextIdx];
  state.currentAgent = nextAgent;

  const nextTask = buildTaskForRole(nextAgent, state);
  await runAgentForState(state, nextTask, postInThread);
}

function buildTaskForRole(role: AgentRole, state: WorkflowState): string {
  switch (role) {
    case "architect":
      return `Product ticket (from GitHub Issue):\n\n${state.ticketBody ?? "See thread."}\n\nAnalyze the codebase at the current directory and produce the technical solution document. Post the solution and add it as a comment on the GitHub issue if possible.`;
    case "developer": {
      const issueNum = state.issueNumber ?? 0;
      return (
        `Technical solution to implement:\n\n${state.solutionDoc ?? "See thread."}\n\n` +
        `Repository: ${state.project.githubSlug}\n` +
        `Issue: #${issueNum} (Closes #${issueNum} in PR body)\n` +
        `Default branch: ${state.project.defaultBranch}\n\n` +
        `Create a feature branch from ${state.project.defaultBranch}, implement following TDD, then:\n` +
        `1. Push: git push -u origin <your-branch>\n` +
        `2. Create PR: gh pr create --repo ${state.project.githubSlug} --base ${state.project.defaultBranch} --title "<short title>" --body "Closes #${issueNum}"\n` +
        `3. Output the PR URL on its own line (e.g. https://github.com/${state.project.githubSlug}/pull/N) so the orchestrator can hand off to QA.`
      );
    }
    case "qa": {
      const prUrl = state.prUrl ?? "";
      const prNum = prUrl ? parsePrNumberFromUrl(prUrl) : null;
      const slug = state.project.githubSlug;
      const issueNum = state.issueNumber ?? 0;
      return (
        `Repository: ${slug}\n` +
        `Issue number: ${issueNum}\n` +
        `PR URL: ${prUrl}\n` +
        `PR number: ${prNum ?? "unknown"}\n\n` +
        `1. Read acceptance criteria from the issue: gh issue view ${issueNum} --repo ${slug}\n` +
        `2. Check out the PR branch: gh pr checkout ${prNum ?? "<PR_NUMBER>"} --repo ${slug}\n` +
        `3. Run the test suite (e.g. npx vitest run), then verify each acceptance criterion.\n` +
        `4. Use agent-browser for browser-based checks (see your instructions).\n\n` +
        `Original ticket (for reference):\n${state.ticketBody ?? "See thread."}\n\n` +
        `Either approve (end with [QA_APPROVED] on its own line) or list issues for the Developer with Expected/Actual/Repro/Severity.`
      );
    }
    default:
      return "Continue.";
  }
}

export async function bootstrapAndStart(
  channelId: string,
  threadTs: string,
  task: string,
  project: ProjectConfig,
  postInThread: PostInThreadFn
): Promise<void> {
  if (!env.githubOwner) {
    await postInThread("Bootstrap requires GITHUB_OWNER to be set in the environment.");
    return;
  }

  if (store.has(threadTs) || bootstrapLocks.has(threadTs)) {
    await postInThread("A workflow is already running in this thread. Please wait for it to finish.");
    return;
  }
  bootstrapLocks.add(threadTs);

  try {
    const bootstrapTask =
      `You are bootstrapping a new project. Do the following in order.\n\n` +
      `1. Create GitHub repo and local clone:\n` +
      `   - From directory: ${projectsDir}\n` +
      `   - Run: gh repo create ${project.githubSlug} --private --add-readme --clone\n` +
      `   This creates the repo and clones it to ${project.repoPath}\n\n` +
      `2. Ensure GitHub Project #${project.githubProjectNumber} has a Status single-select field with exactly these options: Triage, Architecture, In Development, In QA, Needs Fix, Done.\n` +
      `   - Use \`gh project field-list ${project.githubProjectNumber} --owner ${env.githubOwner} --format json\` to check.\n` +
      `   - If the default Status has different options, add a new single-select field named "Status" with the six options above, or use \`gh api graphql\` to add options to the existing Status field.`;

    await postInThread("_Setting up a new project for this channel (creating repo and configuring GitHub Project)..._");

    let result: string;
    try {
      result = await Promise.race([
        runAgent({
          role: "developer",
          task: bootstrapTask,
          cwd: projectsDir,
          allowedTools: getAgentConfig("developer").allowedTools,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Bootstrap timed out after ${Math.round(agentTimeoutMs / 60000)} minutes`)),
            agentTimeoutMs,
          )
        ),
      ]);
    } catch (err) {
      console.error("Bootstrap failed:", err);
      await postInThread("Bootstrap failed. Check server logs for details.");
      return;
    }

    await postInThread(escapeSlackMrkdwn(result));

    if (!existsSync(project.repoPath)) {
      await postInThread("_Bootstrap completed but the repo was not created. Check the output above for errors._");
      return;
    }

    await postInThread("_Project ready. Starting PM with your request..._");
  } finally {
    bootstrapLocks.delete(threadTs);
  }

  await start(channelId, threadTs, "PM", task, project, postInThread);
}
