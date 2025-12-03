import express, { Express, Request, Response, Router } from "express";
import { ethers } from "ethers";
import { createThirdwebClient } from "thirdweb";
import { facilitator } from "thirdweb/x402";
import { config } from "../config/env.js";
import { getCurrentNetworkConfig } from "../config/networkConfig.js";
import { logger } from "../utils/logger.js";
import { getMeter, MeterConfig } from "./metering.js";

/**
 * x402 Facilitator Server
 * Implements a real x402 facilitator using Thirdweb x402 SDK
 * Validates and settles payments on-chain
 */

// Payment proof structure (EIP-3009 style)
interface PaymentProof {
  from: string;
  to: string;
  value: string;
  validAfter: number;
  validBefore: number;
  nonce: string;
  signature: string;
}

interface ValidationRequest {
  proof: string | PaymentProof;
  meterId: string;
  price?: string;
  asset?: string;
  chain?: string;
}

interface ValidationResponse {
  valid: boolean;
  payer?: string;
  amount?: string;
  error?: string;
  message?: string;
}

interface VerifyRequest {
  x402Version?: number;
  paymentPayload: any;
  paymentRequirements: any;
}

interface SettleRequest {
  x402Version?: number;
  paymentPayload: any;
  paymentRequirements: any;
}

// Initialize Thirdweb client and facilitator
let thirdwebFacilitator: ReturnType<typeof facilitator> | null = null;

function getThirdwebFacilitator() {
  if (thirdwebFacilitator) {
    return thirdwebFacilitator;
  }

  // Create Thirdweb client
  if (!config.thirdwebSecretKey) {
    throw new Error(
      "THIRDWEB_SECRET_KEY must be configured for Thirdweb facilitator. Get your secret key from https://portal.thirdweb.com"
    );
  }

  const client = createThirdwebClient({
    secretKey: config.thirdwebSecretKey,
  });

  // Get server wallet address from private key or config
  let serverWalletAddress: string;
  if (config.privateKey) {
    const wallet = new ethers.Wallet(config.privateKey);
    serverWalletAddress = wallet.address;
  } else if (config.serverWalletAddress) {
    serverWalletAddress = config.serverWalletAddress;
  } else {
    throw new Error(
      "Either PRIVATE_KEY or SERVER_WALLET_ADDRESS must be configured for Thirdweb facilitator"
    );
  }

  // Create facilitator instance
  thirdwebFacilitator = facilitator({
    client,
    serverWalletAddress,
  });

  logger.info("Thirdweb x402 facilitator initialized", {
    serverWalletAddress,
  });

  return thirdwebFacilitator;
}

/**
 * Create facilitator router (for mounting in main server)
 */
export function createFacilitatorRouter(): Router {
  const router = Router();
  
  // Health check endpoint
  router.get("/health", (req: Request, res: Response) => {
    res.json({
      status: "healthy",
      network: config.network,
      timestamp: new Date().toISOString(),
    });
  });

  // Validate payment proof endpoint (legacy compatibility)
  router.post("/validate", async (req: Request, res: Response) => {
    try {
      const body: ValidationRequest = req.body;
      const { proof, meterId } = body;

      logger.info(`Validating payment proof for meter: ${meterId}`, {
        meterId,
        timestamp: new Date().toISOString(),
      });

      // Get meter configuration
      const meter = getMeter(meterId);
      if (!meter) {
        return res.status(400).json({
          valid: false,
          error: "METER_NOT_FOUND",
          message: `Meter ${meterId} not found`,
        });
      }

      // Convert to payment payload format for Thirdweb
      const paymentPayload = typeof proof === "string" ? JSON.parse(proof) : proof;
      
      // Get asset address from network config
      const networkConfig = getCurrentNetworkConfig();
      const assetAddress = networkConfig.stablecoins.usdc;
      
      // Get payTo address
      const payToAddress = config.privateKey 
        ? new ethers.Wallet(config.privateKey).address 
        : config.serverWalletAddress || "";
      
      if (!payToAddress) {
        return res.status(500).json({
            valid: false,
          error: "CONFIGURATION_ERROR",
          message: "Server wallet address not configured",
        });
      }

      const paymentRequirements = {
        scheme: "exact" as const,
        network: meter.chain,
        asset: assetAddress,
        payTo: payToAddress,
        maxAmountRequired: meter.price,
        resource: meterId,
        description: meter.description || "Payment for service",
        mimeType: "application/json",
        maxTimeoutSeconds: 600,
      };

      // Use Thirdweb facilitator to verify
      const facilitator = getThirdwebFacilitator();
      const result = await facilitator.verify(
        paymentPayload,
        paymentRequirements
      );

      if (result.isValid) {
        logger.info(`Payment validated successfully`, {
          payer: result.payer,
        });
        res.json({
          valid: true,
          payer: result.payer,
          amount: paymentRequirements.maxAmountRequired,
        });
      } else {
        logger.warn(`Payment validation failed`, {
          error: result.invalidReason,
          message: result.errorMessage,
        });
        res.status(402).json({
          valid: false,
          error: result.invalidReason || "VALIDATION_FAILED",
          message: result.errorMessage || "Payment validation failed",
        });
      }
    } catch (error) {
      logger.error("Error validating payment", error);
      res.status(500).json({
        valid: false,
        error: "VALIDATION_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Verify payment endpoint (for MerchantExecutor compatibility)
  router.post("/verify", async (req: Request, res: Response) => {
    try {
      const body: VerifyRequest = req.body;
      const { paymentPayload, paymentRequirements } = body;

      logger.info("Verifying payment via Thirdweb facilitator");

      // Use Thirdweb facilitator to verify
      const facilitator = getThirdwebFacilitator();
      
      // Call Thirdweb facilitator verify method
      const result = await facilitator.verify(
        paymentPayload,
        paymentRequirements
      );

      if (result.isValid) {
        res.json({
          valid: true,
          payer: result.payer,
          amount: paymentRequirements.maxAmountRequired,
        });
      } else {
        res.status(402).json({
          valid: false,
          error: result.invalidReason || "VERIFICATION_FAILED",
          message: result.errorMessage || "Payment verification failed",
        });
      }
    } catch (error) {
      logger.error("Error verifying payment", error);
      res.status(500).json({
        valid: false,
        error: "VERIFICATION_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Settle payment endpoint (execute on-chain)
  router.post("/settle", async (req: Request, res: Response) => {
    try {
      const body: SettleRequest = req.body;
      const { paymentPayload, paymentRequirements } = body;

      logger.info("Settling payment via Thirdweb facilitator");

      // Use Thirdweb facilitator to settle
      const facilitator = getThirdwebFacilitator();
      
      // Call Thirdweb facilitator settle method
      const result = await facilitator.settle(
        paymentPayload,
        paymentRequirements
      );

      if (result.success) {
        res.json({
          success: true,
          transactionHash: result.transaction,
          payer: result.payer,
          amount: paymentRequirements.maxAmountRequired,
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.errorReason || "SETTLEMENT_FAILED",
          message: result.errorMessage || "Payment settlement failed",
        });
      }
    } catch (error) {
      logger.error("Error settling payment", error);
      res.status(500).json({
        success: false,
        error: "SETTLEMENT_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  return router;
}

/**
 * Create and configure the facilitator Express server
 * Can be used as standalone server or mounted as middleware
 */
export function createFacilitatorServer(): Express {
  const app = express();
  app.use(express.json());
  
  // Mount the router
  app.use("/", createFacilitatorRouter());
  
  return app;
}

/**
 * Start the facilitator server
 */
export function startFacilitatorServer(port: number = 3002): void {
  const app = createFacilitatorServer();

  app.listen(port, () => {
    logger.info(`🚀 x402 Facilitator Server running on http://localhost:${port}`);
    logger.info(`📋 Health check: http://localhost:${port}/health`);
    logger.info(`✅ Validate endpoint: http://localhost:${port}/validate`);
    logger.info(`✅ Verify endpoint: http://localhost:${port}/verify`);
    logger.info(`✅ Settle endpoint: http://localhost:${port}/settle`);
    logger.info(`⛓️  Network: ${config.network}`);
  });
}

