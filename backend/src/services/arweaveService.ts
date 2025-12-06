import Arweave from "arweave";
import { logger } from "../utils/logger.js";
import { config } from "../config/env.js";

// Payroll receipt structure for permanent storage on Arweave
export interface PayrollReceipt {
  payrollId: string;
  status: string;
  totalAmount: string;
  currency: string;
  recipientCount: number;
  network: string;
  treasuryContract: string;
  onchainTxHash?: string;
  createdAt: string;
  completedAt: string;
  version: string;
  protocol: string;
  agentId: string;
  x402MeterId: string;
}

// Result of saving receipt to Arweave
export interface ArweaveResult {
  success: boolean;
  url?: string;
  transactionId?: string;
  error?: string;
}

// Initialize Arweave client
// If ARWEAVE_JWK is not configured, Arweave operations will be skipped
let arweave: Arweave | null = null;
let arweaveWallet: any = null;

try {
  const arweaveJwk = process.env.ARWEAVE_JWK;
  if (arweaveJwk) {
    arweave = Arweave.init({
      host: "arweave.net",
      port: 443,
      protocol: "https",
    });
    arweaveWallet = JSON.parse(arweaveJwk);
    logger.info("Arweave client initialized");
  } else {
    logger.warn("ARWEAVE_JWK not configured - Arweave storage will be skipped");
  }
} catch (error) {
  logger.warn("Failed to initialize Arweave client", error);
}

/**
 * Save payroll receipt to Arweave for permanent storage
 * This implements the Memory Layer of the Sovereign Agent Stack
 * 
 * @param receipt - Payroll receipt data to store
 * @returns Result with success status and Arweave URL
 */
export async function saveReceiptToArweave(
  receipt: PayrollReceipt
): Promise<ArweaveResult> {
  // If Arweave is not configured, return a mock result
  if (!arweave || !arweaveWallet) {
    logger.warn("Arweave not configured - skipping receipt storage");
    return {
      success: false,
      error: "Arweave not configured",
    };
  }

  try {
    // Create transaction with receipt data
    const transaction = await arweave.createTransaction(
      {
        data: JSON.stringify(receipt),
      },
      arweaveWallet
    );

    // Add tags for discoverability
    transaction.addTag("Content-Type", "application/json");
    transaction.addTag("Protocol", receipt.protocol);
    transaction.addTag("Agent-Id", receipt.agentId);
    transaction.addTag("Network", receipt.network);
    transaction.addTag("Payroll-Id", receipt.payrollId);
    transaction.addTag("Version", receipt.version);

    // Sign transaction
    await arweave.transactions.sign(transaction, arweaveWallet);

    // Submit transaction
    const response = await arweave.transactions.post(transaction);

    if (response.status === 200 || response.status === 208) {
      const transactionId = transaction.id;
      const url = `https://arweave.net/${transactionId}`;

      logger.info(`Receipt saved to Arweave: ${url}`);

      return {
        success: true,
        url,
        transactionId,
      };
    } else {
      logger.error(`Failed to post transaction to Arweave: ${response.statusText}`);
      return {
        success: false,
        error: `Arweave API error: ${response.statusText}`,
      };
    }
  } catch (error) {
    logger.error("Error saving receipt to Arweave", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
