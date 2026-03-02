import "dotenv/config";
import { homedir } from "os";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import type { ProjectConfig } from "./workflow/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

export const env = {
  slackBotToken: requireEnv("SLACK_BOT_TOKEN"),
  slackAppToken: requireEnv("SLACK_APP_TOKEN"),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  githubToken: process.env.GITHUB_TOKEN ?? "",
  githubOwner: process.env.GITHUB_OWNER ?? "",
};

export const pathToAgentsMd = join(rootDir, "agents-md");

export const projectsDir = process.env.PROJECTS_DIR ?? join(homedir(), "Projects");

const CHANNEL_NAME_RE = /^[a-z0-9][a-z0-9_-]{0,79}$/;

export function buildProjectConfig(channelName: string, githubProjectNumber: number): ProjectConfig {
  if (!CHANNEL_NAME_RE.test(channelName)) {
    throw new Error(`Invalid channel name: "${channelName}"`);
  }
  const repoPath = resolve(projectsDir, channelName);
  if (!repoPath.startsWith(resolve(projectsDir) + "/")) {
    throw new Error("Invalid channel name: path traversal detected");
  }
  return {
    repoPath,
    githubSlug: `${env.githubOwner}/${channelName}`,
    defaultBranch: "main",
    githubProjectNumber,
  };
}

export const agentRoles = ["pm", "architect", "developer", "qa"] as const;

export const defaultMaxTurns = 200;
export const agentTimeoutMs = parseInt(process.env.AGENT_TIMEOUT_MS ?? "1800000", 10);
export const agentModel = process.env.AGENT_MODEL ?? "claude-haiku-4-5";
