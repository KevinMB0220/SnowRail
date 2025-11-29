#!/usr/bin/env node

/**
 * x402 Facilitator Server Entry Point
 * Standalone facilitator server for validating and settling x402 payments
 */

import { startFacilitatorServer } from "./x402/facilitatorServer.js";
import { config } from "./config/env.js";
import { logger } from "./utils/logger.js";

const FACILITATOR_PORT = parseInt(process.env.FACILITATOR_PORT || "3002", 10);

async function main() {
  logger.info("Starting x402 Facilitator Server...");
  logger.info(`Configuration:`, {
    network: config.network,
    port: FACILITATOR_PORT,
  });

  startFacilitatorServer(FACILITATOR_PORT);
}

main().catch((error) => {
  logger.error("Failed to start facilitator server", error);
  process.exit(1);
});

