import { query } from "@anthropic-ai/claude-agent-sdk";
import { readFileSync } from "fs";
import { join } from "path";
import { pathToAgentsMd, defaultMaxTurns, agentModel } from "../config.js";
import type { AgentRole } from "../workflow/types.js";

export interface RunAgentOptions {
  role: AgentRole;
  task: string;
  cwd: string;
  allowedTools: string[];
  maxTurns?: number;
}

export async function runAgent(opts: RunAgentOptions): Promise<string> {
  const claudeMdPath = join(pathToAgentsMd, opts.role, "CLAUDE.md");
  const systemPrompt = readFileSync(claudeMdPath, "utf-8");

  let result = "";
  const q = query({
    prompt: opts.task,
    options: {
      model: agentModel,
      systemPrompt,
      cwd: opts.cwd,
      allowedTools: opts.allowedTools,
      permissionMode: "acceptEdits",
      maxTurns: opts.maxTurns ?? defaultMaxTurns,
    },
  });

  for await (const message of q) {
    const m = message as { type?: string; message?: { content?: Array<{ type?: string; text?: string }> } };
    if (m.type === "assistant" && m.message?.content) {
      const text = m.message.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { text?: string }).text ?? "")
        .join("");
      result += text;
    }
  }
  return result;
}
