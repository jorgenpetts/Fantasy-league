import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { logger } from "./utils/logger.js";

const server = app.listen(env.PORT, "0.0.0.0", () => {
  logger.info("Fantasy cricket API listening", {
    host: "0.0.0.0",
    port: env.PORT,
    environment: env.NODE_ENV,
  });
});

function shutdown(signal: NodeJS.Signals) {
  logger.info("Shutting down fantasy cricket API", { signal });

  const forceExitTimer = setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000);
  forceExitTimer.unref();

  server.close(async (error) => {
    await prisma.$disconnect();
    clearTimeout(forceExitTimer);

    if (error) {
      logger.error("HTTP server shutdown failed", { error: error.message });
      process.exit(1);
    }

    process.exit(0);
  });
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
