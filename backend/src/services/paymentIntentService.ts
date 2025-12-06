/**
 * Payment Intent Service
 * Handles creation and confirmation of payment intents
 * Updates company balances automatically
 */

import { prisma } from "../dbClient.js";
import { logger } from "../utils/logger.js";
import { getTokenPrice } from "./priceFeedService.js";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * Create a new payment intent
 * @param companyId - Company receiving the payment
 * @param amount - Amount in token units
 * @param token - Token symbol (e.g., "xUSDC")
 * @param externalRef - Optional external reference (invoice ID, etc.)
 * @returns Created Payment record
 */
export async function createPaymentIntent(
  companyId: string,
  amount: number,
  token: string,
  externalRef?: string,
): Promise<{
  id: string;
  paymentIntentId: string;
  companyId: string;
  token: string;
  amountToken: Decimal;
  amountUsd: Decimal;
  status: string;
}> {
  // Validate company exists
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    throw new Error(`Company ${companyId} not found`);
  }

  // Generate unique paymentIntentId
  const paymentIntentId = `pmt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Get USD price for token
  const usdPrice = await getTokenPrice(token);
  const amountUsd = amount * usdPrice;

  // Create payment record
  const payment = await prisma.payment.create({
    data: {
      companyId,
      paymentIntentId,
      externalRef,
      token,
      amountToken: new Decimal(amount.toString()),
      amountUsd: new Decimal(amountUsd.toString()),
      status: "PENDING_X402",
    },
  });

  logger.info(`Payment intent created: ${paymentIntentId} for company ${companyId}`, {
    amount,
    token,
    amountUsd,
  });

  return payment;
}

/**
 * Confirm a payment after on-chain confirmation
 * @param paymentIntentId - Unique payment intent ID
 * @param txHash - Transaction hash from blockchain
 * @param amount - Confirmed amount (for validation)
 * @param token - Token symbol
 * @returns Updated Payment record
 */
export async function confirmPayment(
  paymentIntentId: string,
  txHash: string,
  amount: number,
  token: string,
): Promise<{
  id: string;
  companyId: string;
  status: string;
  txHash: string | null;
}> {
  // Find payment by paymentIntentId
  const payment = await prisma.payment.findUnique({
    where: { paymentIntentId },
  });

  if (!payment) {
    throw new Error(`Payment intent ${paymentIntentId} not found`);
  }

  // Validate status
  if (payment.status !== "PENDING_X402") {
    if (payment.status === "CONFIRMED_ONCHAIN") {
      // Already confirmed - idempotency check
      if (payment.txHash === txHash) {
        logger.info(`Payment ${paymentIntentId} already confirmed with same txHash`);
        return {
          id: payment.id,
          companyId: payment.companyId,
          status: payment.status,
          txHash: payment.txHash,
        };
      } else {
        throw new Error(`Payment ${paymentIntentId} already confirmed with different txHash`);
      }
    }
    throw new Error(`Payment ${paymentIntentId} is in invalid status: ${payment.status}`);
  }

  // Validate amount matches (with small tolerance for fees)
  const paymentAmount = Number(payment.amountToken);
  const tolerance = 0.01; // 1% tolerance
  if (Math.abs(amount - paymentAmount) > paymentAmount * tolerance) {
    logger.warn(`Amount mismatch for ${paymentIntentId}: expected ${paymentAmount}, got ${amount}`);
    // Still proceed but log warning
  }

  // Get USD price (may have changed)
  const usdPrice = await getTokenPrice(token);
  const amountUsd = amount * usdPrice;

  // Update payment status
  const updatedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "CONFIRMED_ONCHAIN",
      txHash,
      amountToken: new Decimal(amount.toString()),
      amountUsd: new Decimal(amountUsd.toString()),
    },
  });

  // Update company balance
  await updateCompanyBalance(
    payment.companyId,
    token,
    new Decimal(amount.toString()),
    new Decimal(amountUsd.toString()),
  );

  logger.info(`Payment confirmed: ${paymentIntentId}`, {
    companyId: payment.companyId,
    txHash,
    amount,
    amountUsd,
  });

  return {
    id: updatedPayment.id,
    companyId: updatedPayment.companyId,
    status: updatedPayment.status,
    txHash: updatedPayment.txHash,
  };
}

/**
 * Update company balance for a specific token
 * Uses upsert to atomically update or create balance record
 * @param companyId - Company ID
 * @param token - Token symbol
 * @param amountToken - Amount to add (in token units)
 * @param amountUsd - Amount to add (in USD)
 * @returns Updated CompanyBalance record
 */
export async function updateCompanyBalance(
  companyId: string,
  token: string,
  amountToken: Decimal,
  amountUsd: Decimal,
): Promise<{
  companyId: string;
  token: string;
  balanceToken: Decimal;
  balanceUsd: Decimal;
}> {
  // Get current balance if exists
  const existing = await prisma.companyBalance.findUnique({
    where: {
      companyId_token: {
        companyId,
        token,
      },
    },
  });

  const newBalanceToken = existing
    ? existing.balanceToken.add(amountToken)
    : amountToken;
  const newBalanceUsd = existing
    ? existing.balanceUsd.add(amountUsd)
    : amountUsd;

  // Upsert balance
  const balance = await prisma.companyBalance.upsert({
    where: {
      companyId_token: {
        companyId,
        token,
      },
    },
    update: {
      balanceToken: newBalanceToken,
      balanceUsd: newBalanceUsd,
      updatedAt: new Date(),
    },
    create: {
      companyId,
      token,
      balanceToken: newBalanceToken,
      balanceUsd: newBalanceUsd,
    },
  });

  logger.info(`Company balance updated: ${companyId}`, {
    token,
    balanceToken: balance.balanceToken.toString(),
    balanceUsd: balance.balanceUsd.toString(),
  });

  return balance;
}

