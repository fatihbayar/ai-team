import { execFileSync } from "child_process";
import { env } from "../config.js";

export interface StatusFieldCache {
  fieldId: string;
  projectId: string;
  options: Record<string, string>;
}

function gh(args: string[]): string {
  return execFileSync("gh", args, {
    encoding: "utf-8",
    env: { ...process.env, GITHUB_TOKEN: env.githubToken },
  });
}

const cache = new Map<number, StatusFieldCache>();

export function initProjectFields(owner: string, projectNumber: number): void {
  const viewRaw = gh([
    "project", "view", String(projectNumber),
    "--owner", owner,
    "--format", "json",
  ]);
  const viewData = JSON.parse(viewRaw) as { id?: string };
  const projectId = viewData.id;
  if (!projectId) {
    throw new Error(`Could not determine project ID for project ${projectNumber}`);
  }
  const raw = gh([
    "project", "field-list", String(projectNumber),
    "--owner", owner,
    "--format", "json",
  ]);
  const data = JSON.parse(raw) as { fields?: Array<{ name: string; id: string; options?: Array<{ name: string; id: string }> }> };
  const fields = data.fields ?? [];
  const statusField = fields.find((f) => f.name === "Status");
  if (!statusField) {
    throw new Error(`Project ${projectNumber} has no "Status" field. Add a Status single-select field with options: Triage, Architecture, In Development, In QA, Needs Fix, Done.`);
  }
  const options: Record<string, string> = {};
  for (const opt of statusField.options ?? []) {
    options[opt.name] = opt.id;
  }
  cache.set(projectNumber, {
    fieldId: statusField.id,
    projectId,
    options,
  });
}

export function updateProjectStatus(
  projectNumber: number,
  projectItemId: string,
  statusName: string
): void {
  const cached = cache.get(projectNumber);
  if (!cached) {
    throw new Error(`Project ${projectNumber} not initialized. Call initProjectFields first.`);
  }
  const optionId = cached.options[statusName];
  if (!optionId) {
    throw new Error(`Status "${statusName}" not found. Available: ${Object.keys(cached.options).join(", ")}`);
  }
  gh([
    "project", "item-edit",
    "--id", projectItemId,
    "--field-id", cached.fieldId,
    "--project-id", cached.projectId,
    "--single-select-option-id", optionId,
  ]);
}

export function ensureProjectFieldsInitialized(owner: string, projectNumber: number): void {
  if (cache.has(projectNumber)) return;
  initProjectFields(owner, projectNumber);
}
