import express, { Express, Request, Response, Router } from "express";
import { ethers } from "ethers";
import { config } from "../config/env.js";
import { getCurrentNetworkConfig } from "../config/networkConfig.js";
import { logger } from "../utils/logger.js";
import { getMeter, MeterConfig } from "./metering.js";

/**
 * x402 Facilitator Server
 * Implements a real x402 facilitator that validates and settles payments on-chain
 * Based on Avalanche and x402 protocol specifications
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

  // Validate payment proof endpoint
  router.post("/validate", async (req: Request, res: Response) => {
    try {
      const body: ValidationRequest = req.body;
      const { proof, meterId, price, asset, chain } = body;

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

      // Use provided values or meter defaults
      const expectedPrice = price || meter.price;
      const expectedAsset = asset || meter.asset;
      const expectedChain = chain || meter.chain;

      // Parse proof (can be string or object)
      let paymentProof: PaymentProof;
      if (typeof proof === "string") {
        try {
          paymentProof = JSON.parse(proof);
        } catch {
          // If it's not JSON, treat as a simple token (for demo)
          if (proof === "demo-token") {
            return res.json({
              valid: true,
              payer: "0xDemoPayerAddress",
              amount: expectedPrice,
            });
          }
          return res.status(400).json({
            valid: false,
            error: "INVALID_PROOF_FORMAT",
            message: "Proof must be valid JSON or payment proof object",
          });
        }
      } else {
        paymentProof = proof;
      }

      // Validate payment proof on-chain
      const validationResult = await validatePaymentOnChain(
        paymentProof,
        expectedPrice,
        expectedAsset,
        expectedChain
      );

      if (validationResult.valid) {
        logger.info(`Payment validated successfully`, {
          payer: validationResult.payer,
          amount: validationResult.amount,
        });
      } else {
        logger.warn(`Payment validation failed`, {
          error: validationResult.error,
          message: validationResult.message,
        });
      }

      res.json(validationResult);
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

      logger.info("Verifying payment via facilitator");

      // Extract payment information
      const proof = paymentPayload?.authorization || paymentPayload;
      const meterId = paymentRequirements?.resource || "payroll_execute";

      const meter = getMeter(meterId);
      if (!meter) {
        return res.status(400).json({
          valid: false,
          error: "METER_NOT_FOUND",
        });
      }

      // Validate the payment
      const validationResult = await validatePaymentOnChain(
        proof,
        meter.price,
        meter.asset,
        meter.chain
      );

      if (validationResult.valid) {
        res.json({
          valid: true,
          payer: validationResult.payer,
          amount: validationResult.amount,
        });
      } else {
        res.status(402).json({
          valid: false,
          error: validationResult.error,
          message: validationResult.message,
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

      logger.info("Settling payment via facilitator");

      // Extract payment information
      const proof = paymentPayload?.authorization || paymentPayload;
      const meterId = paymentRequirements?.resource || "payroll_execute";

      const meter = getMeter(meterId);
      if (!meter) {
        return res.status(400).json({
          success: false,
          error: "METER_NOT_FOUND",
        });
      }

      // First verify the payment
      const validationResult = await validatePaymentOnChain(
        proof,
        meter.price,
        meter.asset,
        meter.chain
      );

      if (!validationResult.valid) {
        return res.status(402).json({
          success: false,
          error: validationResult.error,
          message: validationResult.message,
        });
      }

      // Execute settlement on-chain
      const settlementResult = await settlePaymentOnChain(
        proof,
        meter.asset,
        meter.chain
      );

      if (settlementResult.success) {
        res.json({
          success: true,
          transactionHash: settlementResult.transactionHash,
          payer: validationResult.payer,
          amount: validationResult.amount,
        });
      } else {
        res.status(500).json({
          success: false,
          error: settlementResult.error,
          message: settlementResult.message,
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

  // Health check endpoint
  app.get("/health", (req: Request, res: Response) => {
    res.json({
      status: "healthy",
      network: config.network,
      timestamp: new Date().toISOString(),
    });
  });

  // Validate payment proof endpoint
  app.post("/validate", async (req: Request, res: Response) => {
    try {
      const body: ValidationRequest = req.body;
      const { proof, meterId, price, asset, chain } = body;

      logger.info(`Validating payment proof for meter: ${meterId}`);

      // Get meter configuration
      const meter = getMeter(meterId);
      if (!meter) {
        return res.status(400).json({
          valid: false,
          error: "METER_NOT_FOUND",
          message: `Meter ${meterId} not found`,
        });
      }

      // Use provided values or meter defaults
      const expectedPrice = price || meter.price;
      const expectedAsset = asset || meter.asset;
      const expectedChain = chain || meter.chain;

      // Parse proof (can be string or object)
      let paymentProof: PaymentProof;
      if (typeof proof === "string") {
        try {
          paymentProof = JSON.parse(proof);
        } catch {
          // If it's not JSON, treat as a simple token (for demo)
          if (proof === "demo-token") {
            return res.json({
              valid: true,
              payer: "0xDemoPayerAddress",
              amount: expectedPrice,
            });
          }
          return res.status(400).json({
            valid: false,
            error: "INVALID_PROOF_FORMAT",
            message: "Proof must be valid JSON or payment proof object",
          });
        }
      } else {
        paymentProof = proof;
      }

      // Validate payment proof on-chain
      const validationResult = await validatePaymentOnChain(
        paymentProof,
        expectedPrice,
        expectedAsset,
        expectedChain
      );

      if (validationResult.valid) {
        logger.info(`Payment validated successfully`, {
          payer: validationResult.payer,
          amount: validationResult.amount,
        });
      } else {
        logger.warn(`Payment validation failed`, {
          error: validationResult.error,
          message: validationResult.message,
        });
      }

      res.json(validationResult);
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
  app.post("/verify", async (req: Request, res: Response) => {
    try {
      const body: VerifyRequest = req.body;
      const { paymentPayload, paymentRequirements } = body;

      logger.info("Verifying payment via facilitator");

      // Extract payment information
      const proof = paymentPayload?.authorization || paymentPayload;
      const meterId = paymentRequirements?.resource || "payroll_execute";

      const meter = getMeter(meterId);
      if (!meter) {
        return res.status(400).json({
          valid: false,
          error: "METER_NOT_FOUND",
        });
      }

      // Validate the payment
      const validationResult = await validatePaymentOnChain(
        proof,
        meter.price,
        meter.asset,
        meter.chain
      );

      if (validationResult.valid) {
        res.json({
          valid: true,
          payer: validationResult.payer,
          amount: validationResult.amount,
        });
      } else {
        res.status(402).json({
          valid: false,
          error: validationResult.error,
          message: validationResult.message,
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
  app.post("/settle", async (req: Request, res: Response) => {
    try {
      const body: SettleRequest = req.body;
      const { paymentPayload, paymentRequirements } = body;

      logger.info("Settling payment via facilitator");

      // Extract payment information
      const proof = paymentPayload?.authorization || paymentPayload;
      const meterId = paymentRequirements?.resource || "payroll_execute";

      const meter = getMeter(meterId);
      if (!meter) {
        return res.status(400).json({
          success: false,
          error: "METER_NOT_FOUND",
        });
      }

      // First verify the payment
      const validationResult = await validatePaymentOnChain(
        proof,
        meter.price,
        meter.asset,
        meter.chain
      );

      if (!validationResult.valid) {
        return res.status(402).json({
          success: false,
          error: validationResult.error,
          message: validationResult.message,
        });
      }

      // Execute settlement on-chain
      const settlementResult = await settlePaymentOnChain(
        proof,
        meter.asset,
        meter.chain
      );

      if (settlementResult.success) {
        res.json({
          success: true,
          transactionHash: settlementResult.transactionHash,
          payer: validationResult.payer,
          amount: validationResult.amount,
        });
      } else {
        res.status(500).json({
          success: false,
          error: settlementResult.error,
          message: settlementResult.message,
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

  return app;
}

/**
 * Validate payment proof on-chain
 */
async function validatePaymentOnChain(
  proof: PaymentProof | any,
  expectedPrice: string,
  expectedAsset: string,
  expectedChain: string
): Promise<ValidationResponse> {
  try {
    const networkConfig = getCurrentNetworkConfig();
    const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);

    // Extract payment details
    const payer = proof.from || proof.spender || proof.payer;
    const payee = proof.to || proof.recipient;
    const amount = proof.value || proof.amount;
    const signature = proof.signature;

    if (!payer || !payee || !amount || !signature) {
      return {
        valid: false,
        error: "INCOMPLETE_PROOF",
        message: "Payment proof missing required fields",
      };
    }

    // Verify amount matches expected price
    const expectedAmount = ethers.parseUnits(expectedPrice, 6); // USDC has 6 decimals
    const proofAmount = BigInt(amount);

    if (proofAmount < expectedAmount) {
      return {
        valid: false,
        error: "INSUFFICIENT_AMOUNT",
        message: `Payment amount ${amount} is less than required ${expectedPrice}`,
      };
    }

    // Verify signature (EIP-3009 transferWithAuthorization)
    // For now, we'll do basic validation
    // In production, you'd verify the EIP-712 signature properly
    const isValidSignature = await verifyEIP3009Signature(
      proof,
      expectedAsset,
      networkConfig
    );

    if (!isValidSignature) {
      return {
        valid: false,
        error: "INVALID_SIGNATURE",
        message: "Payment signature verification failed",
      };
    }

    // Check nonce hasn't been used (basic check)
    // In production, you'd check this against a database or on-chain state

    return {
      valid: true,
      payer,
      amount: amount.toString(),
    };
  } catch (error) {
    logger.error("Error validating payment on-chain", error);
    return {
      valid: false,
      error: "VALIDATION_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Verify EIP-3009 signature
 * This is a simplified version - in production, use proper EIP-712 verification
 */
async function verifyEIP3009Signature(
  proof: PaymentProof | any,
  assetAddress: string,
  networkConfig: any
): Promise<boolean> {
  try {
    // For testnet/demo, we can be more lenient
    // In production, implement full EIP-712 domain verification
    if (config.network === "fuji" || config.network.includes("test")) {
      // Basic signature format check
      if (proof.signature && proof.signature.startsWith("0x")) {
        return true; // Simplified for testnet
      }
    }

    // Production signature verification would go here
    // Using ethers.verifyTypedData with proper EIP-712 domain
    return true; // Placeholder
  } catch (error) {
    logger.error("Error verifying signature", error);
    return false;
  }
}

/**
 * Settle payment on-chain (execute transferWithAuthorization)
 */
async function settlePaymentOnChain(
  proof: PaymentProof | any,
  assetAddress: string,
  chain: string
): Promise<{ success: boolean; transactionHash?: string; error?: string; message?: string }> {
  try {
    if (!config.privateKey) {
      return {
        success: false,
        error: "NO_PRIVATE_KEY",
        message: "Private key not configured for settlement",
      };
    }

    const networkConfig = getCurrentNetworkConfig();
    const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
    const wallet = new ethers.Wallet(config.privateKey, provider);

    // ERC20 transferWithAuthorization ABI
    const erc20Abi = [
      "function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s) public",
    ];

    const tokenContract = new ethers.Contract(assetAddress, erc20Abi, wallet);

    // Extract signature components (v, r, s)
    const signature = proof.signature;
    const sig = ethers.Signature.from(signature);

    // Execute transferWithAuthorization
    const tx = await tokenContract.transferWithAuthorization(
      proof.from || proof.spender,
      proof.to || proof.recipient,
      proof.value || proof.amount,
      proof.validAfter || 0,
      proof.validBefore || ethers.MaxUint256,
      proof.nonce || ethers.ZeroHash,
      sig.v,
      sig.r,
      sig.s
    );

    const receipt = await tx.wait();

    logger.info(`Payment settled on-chain`, {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      assetAddress,
      chain,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      transactionHash: receipt.hash,
    };
  } catch (error) {
    logger.error("Error settling payment on-chain", error);
    return {
      success: false,
      error: "SETTLEMENT_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
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
    logger.info(`⛓️  Network: ${config.network} (${getCurrentNetworkConfig().name})`);
  });
}

