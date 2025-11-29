import { createApp } from "./app";
import { config } from "./config/env";
import { logger } from "./utils/logger";

/**
 * SnowRail Backend Entry Point
 * Starts the Express server
 */

async function main() {
  const app = createApp();

  app.listen(config.port, () => {
    logger.info(`🚀 SnowRail API running on http://localhost:${config.port}`);
    logger.info(`📋 Health check: http://localhost:${config.port}/api/health`);
    logger.info(`💰 x402 Protocol enabled`);
    logger.info(`⛓️  Network: ${config.network}`);
  });
}

main().catch((error) => {
  logger.error("Failed to start server", error);
  process.exit(1);
});

