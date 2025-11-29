import { ethers } from "ethers";
import { getTreasuryContract, getTreasuryContractReadOnly, getProvider } from "../config/contractConfig.js";
import { getCurrentNetworkConfig } from "../config/networkConfig.js";
import { logger } from "../utils/logger.js";
import { prisma } from "../dbClient.js";
import { PaymentStatus } from "../domain/payment.js";
import { PayrollStatus } from "../domain/payroll.js";
import {
  requestOnchainPayment,
  executeOnchainPayment,
  getTreasuryBalance,
} from "./treasuryClient.js";

/**
 * Contract Hook Service
 * Integrates the SnowRailTreasury contract with the payroll system
 */

/**
 * Convert USD amount (in cents) to token amount (bigint)
 * @param usdCents - Amount in USD cents
 * @param tokenDecimals - Token decimals (default 6 for USDC)
 * @returns Amount in token units
 */
function usdCentsToTokenAmount(usdCents: number, tokenDecimals: number = 6): bigint {
  // Convert cents to dollars, then to token units
  const dollars = usdCents / 100;
  return ethers.parseUnits(dollars.toFixed(tokenDecimals), tokenDecimals);
}

/**
 * Get token address for currency
 * @param currency - Currency code (USD, etc.)
 * @returns Token address
 */
function getTokenAddress(currency: string): string {
  const networkConfig = getCurrentNetworkConfig();
  
  // Default to USDC for USD
  if (currency === "USD") {
    return networkConfig.stablecoins.usdc;
  }
  
  // Add more currency mappings as needed
  return networkConfig.stablecoins.usdc;
}

/**
 * Request payments on-chain for a payroll
 * @param payrollId - Payroll ID
 * @returns Array of transaction hashes
 */
export async function requestPayrollPayments(payrollId: string): Promise<string[]> {
  logger.info(`Requesting on-chain payments for payroll: ${payrollId}`);
  
  const payroll = await prisma.payroll.findUnique({
    where: { id: payrollId },
    include: { payments: true },
  });

  if (!payroll) {
    throw new Error(`Payroll not found: ${payrollId}`);
  }

  const tokenAddress = getTokenAddress(payroll.currency);
  const tokenDecimals = 6; // USDC has 6 decimals
  const transactionHashes: string[] = [];

  // Request payment for each payment in the payroll
  for (const payment of payroll.payments) {
    try {
      if (!payment.recipient) {
        logger.warn(`Payment ${payment.id} has no recipient, skipping`);
        continue;
      }

      const amount = usdCentsToTokenAmount(payment.amount, tokenDecimals);
      
      logger.info(
        `Requesting payment: ${payment.id}, amount: ${payment.amount} cents (${amount} tokens), recipient: ${payment.recipient}`
      );

      const txHash = await requestOnchainPayment(
        payment.recipient,
        amount,
        tokenAddress
      );

      transactionHashes.push(txHash);
      
      // Update payment with transaction hash
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.ONCHAIN_REQUESTED,
          // Store tx hash in a metadata field if available, or log it
        },
      });

      logger.info(`Payment ${payment.id} requested on-chain. TX: ${txHash}`);
    } catch (error) {
      logger.error(`Failed to request payment ${payment.id} on-chain`, error);
      // Continue with other payments even if one fails
    }
  }

  // Update payroll status
  await prisma.payroll.update({
    where: { id: payrollId },
    data: { status: PayrollStatus.ONCHAIN_REQUESTED },
  });

  logger.info(`Requested ${transactionHashes.length} payments on-chain for payroll: ${payrollId}`);
  return transactionHashes;
}

/**
 * Execute payments on-chain for a payroll
 * @param payrollId - Payroll ID
 * @returns Array of transaction hashes
 */
export async function executePayrollPayments(payrollId: string): Promise<string[]> {
  logger.info(`Executing on-chain payments for payroll: ${payrollId}`);
  
  const payroll = await prisma.payroll.findUnique({
    where: { id: payrollId },
    include: { payments: true },
  });

  if (!payroll) {
    throw new Error(`Payroll not found: ${payrollId}`);
  }

  const tokenAddress = getTokenAddress(payroll.currency);
  const tokenDecimals = 6; // USDC has 6 decimals
  const transactionHashes: string[] = [];

  // Check treasury balance first
  const treasuryBalance = await getTreasuryBalance(tokenAddress);
  const totalAmount = payroll.payments.reduce(
    (sum, p) => sum + usdCentsToTokenAmount(p.amount, tokenDecimals),
    BigInt(0)
  );

  if (treasuryBalance < totalAmount) {
    logger.error(
      `Insufficient treasury balance. Required: ${totalAmount}, Available: ${treasuryBalance}`
    );
    throw new Error("Insufficient treasury balance");
  }

  // Get payer address (contract owner or treasury address)
  const contract = getTreasuryContractReadOnly();
  const payerAddress = await contract.owner();

  // Execute payment for each payment in the payroll
  for (const payment of payroll.payments) {
    try {
      if (!payment.recipient) {
        logger.warn(`Payment ${payment.id} has no recipient, skipping`);
        continue;
      }

      const amount = usdCentsToTokenAmount(payment.amount, tokenDecimals);
      
      logger.info(
        `Executing payment: ${payment.id}, amount: ${payment.amount} cents (${amount} tokens), recipient: ${payment.recipient}`
      );

      const txHash = await executeOnchainPayment(
        payerAddress,
        payment.recipient,
        amount,
        tokenAddress
      );

      transactionHashes.push(txHash);
      
      // Update payment status
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.ONCHAIN_PAID,
        },
      });

      logger.info(`Payment ${payment.id} executed on-chain. TX: ${txHash}`);
    } catch (error) {
      logger.error(`Failed to execute payment ${payment.id} on-chain`, error);
      
      // Mark payment as failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
        },
      });
    }
  }

  // Update payroll status based on payment results
  const payments = await prisma.payment.findMany({
    where: { payrollId },
  });

  const allPaid = payments.every((p) => p.status === PaymentStatus.ONCHAIN_PAID);
  const anyFailed = payments.some((p) => p.status === PaymentStatus.FAILED);

  let payrollStatus: string = PayrollStatus.ONCHAIN_PAID;
  if (anyFailed) {
    payrollStatus = allPaid ? PayrollStatus.PARTIALLY_PAID : PayrollStatus.FAILED;
  }

  await prisma.payroll.update({
    where: { id: payrollId },
    data: { status: payrollStatus },
  });

  logger.info(`Executed ${transactionHashes.length} payments on-chain for payroll: ${payrollId}`);
  return transactionHashes;
}

/**
 * Check treasury balance for a currency
 * @param currency - Currency code
 * @returns Balance in token units and formatted
 */
export async function checkTreasuryBalance(currency: string = "USD"): Promise<{
  balance: bigint;
  formatted: string;
  decimals: number;
}> {
  const tokenAddress = getTokenAddress(currency);
  const decimals = 6; // USDC has 6 decimals
  const balance = await getTreasuryBalance(tokenAddress);
  const formatted = ethers.formatUnits(balance, decimals);

  return {
    balance,
    formatted,
    decimals,
  };
}

/**
 * Start listening to contract events and update payment status
 * This should be called when the server starts
 */
export function startContractEventListener() {
  logger.info("Starting contract event listener");

  const contract = getTreasuryContractReadOnly();
  const provider = getProvider();

  // Listen to PaymentExecuted events
  contract.on("PaymentExecuted", async (payer, payee, amount, token, event) => {
    logger.info(`PaymentExecuted event: ${payee} received ${amount} of token ${token}`);
    
    // Find payment by recipient address
    const payment = await prisma.payment.findFirst({
      where: {
        recipient: payee.toLowerCase(),
        status: { in: [PaymentStatus.ONCHAIN_REQUESTED, PaymentStatus.PENDING] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.ONCHAIN_PAID },
      });
      logger.info(`Updated payment ${payment.id} status to ONCHAIN_PAID`);
    }
  });

  // Listen to PaymentFailed events
  contract.on("PaymentFailed", async (payer, payee, amount, token, reason, event) => {
    logger.warn(`PaymentFailed event: ${payee}, reason: ${reason}`);
    
    // Find payment by recipient address
    const payment = await prisma.payment.findFirst({
      where: {
        recipient: payee.toLowerCase(),
        status: { in: [PaymentStatus.ONCHAIN_REQUESTED, PaymentStatus.PENDING] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });
      logger.info(`Updated payment ${payment.id} status to FAILED`);
    }
  });

  logger.info("Contract event listener started");
}

/**
 * Stop listening to contract events
 */
export function stopContractEventListener() {
  logger.info("Stopping contract event listener");
  const contract = getTreasuryContractReadOnly();
  contract.removeAllListeners();
  logger.info("Contract event listener stopped");
}

