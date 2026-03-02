import { App } from "@slack/bolt";
import { env } from "../config.js";
import { ensureProjectFieldsInitialized } from "../workflow/engine.js";
import { registerRouter } from "./router.js";

const app = new App({
  token: env.slackBotToken,
  socketMode: true,
  appToken: env.slackAppToken,
});

registerRouter(app);

ensureProjectFieldsInitialized();

(async () => {
  await app.start();
  console.log("AI Team Slack app is running (Socket Mode).");
})();
