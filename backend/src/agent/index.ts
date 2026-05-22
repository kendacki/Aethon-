import * as dotenv from "dotenv";
import { AgentCore } from "./AgentCore.js";
import { loadAgentConfig } from "./config.js";

dotenv.config();

async function main() {
  const config = loadAgentConfig();
  const agent = new AgentCore(config);

  process.on("SIGINT", async () => {
    await agent.stop();
    process.exit(0);
  });
  process.on("SIGTERM", async () => {
    await agent.stop();
    process.exit(0);
  });

  await agent.start();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
