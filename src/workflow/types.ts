export type AgentRole = "pm" | "architect" | "developer" | "qa";

export interface ProjectConfig {
  repoPath: string;
  githubSlug: string;
  defaultBranch: string;
  githubProjectNumber: number;
}

export type TicketStatus =
  | "Triage"
  | "Architecture"
  | "In Development"
  | "In QA"
  | "Needs Fix"
  | "Done";

export interface WorkflowState {
  channelId: string;
  threadTs: string;
  project: ProjectConfig;
  currentAgent: AgentRole;
  projectItemId: string | null;
  issueNumber: number | null;
  prUrl: string | null;
  ticketBody: string | null;
  solutionDoc: string | null;
  qaRetries: number;
  createdAt: number;
}
