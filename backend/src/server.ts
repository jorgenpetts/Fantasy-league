import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { logger } from "./utils/logger.js";
import { getCurrentRound } from "./services/round.service.js";
import { AppError } from "./utils/AppError.js";

const server = app.listen(env.PORT, "0.0.0.0", () => {
  logger.info("Fantasy cricket API listening", {
    host: "0.0.0.0",
    port: env.PORT,
    environment: env.NODE_ENV,
  });
});

async function initializeCurrentRound() {
  try {
    await getCurrentRound();
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 404) return;
    logger.error("Current round lineup initialization failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

void initializeCurrentRound();
const carryForwardTimer = setInterval(() => void initializeCurrentRound(), 60_000);
carryForwardTimer.unref();

function shutdown(signal: NodeJS.Signals) {
  clearInterval(carryForwardTimer);
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
