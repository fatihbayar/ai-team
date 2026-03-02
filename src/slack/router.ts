import type { App } from "@slack/bolt";
import { getProjectByChannel } from "../config.js";
import { start } from "../workflow/engine.js";

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

    const project = getProjectByChannel(channelName);
    if (!project) {
      await client.chat.postMessage({
        channel: channelId,
        thread_ts: threadTs,
        text: `Channel #${channelName} is not linked to a project. Add it to \`projects.json\`.`,
      });
      return;
    }

    const agentMatch = text.match(/(?:PM|Architect|Dev|QA)\s*:?\s*([\s\S]*)/i);
    const task = agentMatch ? agentMatch[1].trim() : text.trim();
    const agentName = text.match(/(PM|Architect|Dev|QA)/i)?.[1] ?? "PM";

    if (!task && agentName.toUpperCase() === "PM") {
      await client.chat.postMessage({
        channel: channelId,
        thread_ts: threadTs,
        text: "Describe what you want to build. Example: `@AI Team PM: Add user registration with email verification`",
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

    await postInThread("Starting workflow…");

    start(channelId, threadTs, agentName, task || "Create a ticket for this request.", project, postInThread).catch(
      (err) => {
        postInThread(`Workflow error: ${(err as Error).message}`).catch(() => {});
      }
    );
  });
}
