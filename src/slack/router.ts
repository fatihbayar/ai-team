import { existsSync } from "fs";
import type { App } from "@slack/bolt";
import { buildProjectConfig } from "../config.js";
import { bootstrapAndStart, start } from "../workflow/engine.js";

export function registerRouter(app: App): void {
  app.event("app_mention", async ({ event, client }) => {
    const channelId = event.channel;
    const threadTs = event.ts;
    const text = event.text ?? "";

    let channelName: string;
    try {
      const channelInfo = await client.conversations.info({ channel: channelId });
      channelName = (channelInfo.channel as { name?: string } | undefined)?.name ?? "";
    } catch {
      await client.chat.postMessage({
        channel: channelId,
        thread_ts: threadTs,
        text: "Could not resolve channel name.",
      });
      return;
    }

    if (!channelName) {
      await client.chat.postMessage({
        channel: channelId,
        thread_ts: threadTs,
        text: "Could not resolve channel name.",
      });
      return;
    }

    const projectNumberMatch = text.match(/githubProjectNumber:\s*(\d+)/i);
    if (!projectNumberMatch) {
      await client.chat.postMessage({
        channel: channelId,
        thread_ts: threadTs,
        text: "Please include `githubProjectNumber: <number>` at the end of your message.\nExample: `@AI Team PM: Build a todo app. githubProjectNumber: 2`",
      });
      return;
    }

    const parsed = parseInt(projectNumberMatch[1], 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 999_999_999) {
      await client.chat.postMessage({
        channel: channelId,
        thread_ts: threadTs,
        text: "Invalid `githubProjectNumber`. Use a number between 1 and 999999999.",
      });
      return;
    }

    const textWithoutProjectNumber = text.replace(/githubProjectNumber:\s*\d+/i, "").trim();
    const agentMatch = textWithoutProjectNumber.match(/(?:PM|Architect|Dev|QA)\s*:?\s*([\s\S]*)/i);
    const task = (agentMatch ? agentMatch[1].trim() : textWithoutProjectNumber.trim()).replace(/\.\s*$/, "");
    const agentName = textWithoutProjectNumber.match(/(PM|Architect|Dev|QA)/i)?.[1] ?? "PM";

    let project;
    try {
      project = buildProjectConfig(channelName, parsed);
    } catch {
      await client.chat.postMessage({
        channel: channelId,
        thread_ts: threadTs,
        text: "This channel name is not supported for project creation.",
      });
      return;
    }

    const postInThread = async (msg: string) => {
      await client.chat.postMessage({
        channel: channelId,
        thread_ts: threadTs,
        text: msg,
      });
    };

    if (!existsSync(project.repoPath)) {
      if (!task) {
        await postInThread(
          "This channel doesn't have a local repo yet. Describe what you want to build and I'll set everything up.\nExample: `@AI Team PM: Build a todo app with user auth. githubProjectNumber: 2`"
        );
        return;
      }
      await postInThread("Starting workflow…");
      bootstrapAndStart(channelId, threadTs, task, project, postInThread).catch((err) => {
        console.error("Bootstrap workflow error:", err);
        postInThread("Workflow encountered an error. Check server logs for details.").catch(() => {});
      });
      return;
    }

    if (!task && agentName.toUpperCase() === "PM") {
      await postInThread(
        "Describe what you want to build. Example: `@AI Team PM: Add user registration with email verification. githubProjectNumber: 2`"
      );
      return;
    }

    await postInThread("Starting workflow…");
    start(channelId, threadTs, agentName, task || "Create a ticket for this request.", project, postInThread).catch(
      (err) => {
        console.error("Workflow error:", err);
        postInThread("Workflow encountered an error. Check server logs for details.").catch(() => {});
      }
    );
  });
}
