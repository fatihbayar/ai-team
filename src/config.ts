import "dotenv/config";
import { readFileSync, existsSync } from "fs";
import { join, dirname, resolve, isAbsolute } from "path";
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

const projectsPath = join(rootDir, "projects.json");

let projectRegistry: Map<string, ProjectConfig> | null = null;

export function loadProjectRegistry(): Map<string, ProjectConfig> {
  if (projectRegistry) {
    return projectRegistry;
  }
  const raw = readFileSync(projectsPath, "utf-8");
  const data = JSON.parse(raw) as Record<string, ProjectConfig>;
  for (const [channel, cfg] of Object.entries(data)) {
    const resolved = resolve(cfg.repoPath);
    if (!isAbsolute(resolved) || !existsSync(resolved)) {
      throw new Error(
        `projects.json: channel "${channel}" has invalid repoPath "${cfg.repoPath}" (resolved to "${resolved}"). Must be an absolute path to an existing directory.`
      );
    }
    cfg.repoPath = resolved;
  }
  projectRegistry = new Map(Object.entries(data));
  return projectRegistry;
}

export function getProjectByChannel(channelName: string): ProjectConfig | undefined {
  return loadProjectRegistry().get(channelName);
}

export const agentRoles = ["pm", "architect", "developer", "qa"] as const;
export const statusColumnNames = [
  "Triage",
  "Architecture",
  "In Development",
  "In QA",
  "Needs Fix",
  "Done",
] as const;

export const defaultMaxTurns = 30;
export const agentTimeoutMs = parseInt(process.env.AGENT_TIMEOUT_MS ?? "1800000", 10);
export const agentModel = process.env.AGENT_MODEL ?? "claude-haiku-4-5";
