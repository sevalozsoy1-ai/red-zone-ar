import { createServer } from "node:http";
import app from "./app";
import { logger } from "./lib/logger";
import { initializeBattleStore } from "./lib/battle-store";
import { attachBattleSocket } from "./socket/battle-socket";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

await initializeBattleStore();

const httpServer = createServer(app);
attachBattleSocket(httpServer);

httpServer.on("error", (err) => {
  logger.error({ err }, "Error listening on port");
  process.exit(1);
});

httpServer.listen(port, () => {
  logger.info({ port }, "Server listening");
});
