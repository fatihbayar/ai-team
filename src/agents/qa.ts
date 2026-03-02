import type { AgentRole } from "../workflow/types.js";

export const role: AgentRole = "qa";

export const allowedTools = ["Read", "Write", "Edit", "Bash", "Glob"];
