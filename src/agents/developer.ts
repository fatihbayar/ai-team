import type { AgentRole } from "../workflow/types.js";

export const role: AgentRole = "developer";

export const allowedTools = ["Read", "Write", "Edit", "Bash", "Glob"];

export const maxTurns = 60;
