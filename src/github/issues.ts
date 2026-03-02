import { execFileSync } from "child_process";
import { env } from "../config.js";

function gh(args: string[]): string {
  return execFileSync("gh", args, {
    encoding: "utf-8",
    env: { ...process.env, GITHUB_TOKEN: env.githubToken },
  });
}

/**
 * Add an issue to a GitHub Project board and return the project item ID.
 * Call this after the PM agent has created the issue (we have issueNumber and repo).
 */
export function addIssueToProjectAndGetItemId(
  owner: string,
  projectNumber: number,
  repo: string,
  issueNumber: number
): string {
  const issueUrl = `https://github.com/${repo}/issues/${issueNumber}`;
  gh([
    "project", "item-add", String(projectNumber),
    "--owner", owner,
    "--url", issueUrl,
  ]);
  const itemId = getProjectItemIdByIssue(owner, projectNumber, repo, issueNumber);
  if (!itemId) {
    throw new Error(`Could not resolve project item id for ${issueUrl}`);
  }
  return itemId;
}

/**
 * Get project item ID for an issue that is already on the project board.
 */
export function getProjectItemIdByIssue(
  owner: string,
  projectNumber: number,
  repo: string,
  issueNumber: number
): string | null {
  const raw = gh([
    "project", "item-list", String(projectNumber),
    "--owner", owner,
    "--format", "json",
    "--limit", "100",
  ]);
  const data = JSON.parse(raw) as { items?: Array<{ id: string; content?: { number?: number; repository?: { nameWithOwner?: string } } }> };
  const items = data.items ?? [];
  const target = items.find(
    (item) =>
      item.content?.number === issueNumber &&
      item.content?.repository?.nameWithOwner === repo
  );
  return target?.id ?? null;
}
