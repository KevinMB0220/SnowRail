import { prisma } from "../dbClient.js";
import { PayrollStatus, type PayrollStatusType } from "../domain/payroll.js";
import { PaymentStatus, type PaymentStatusType } from "../domain/payment.js";
import { createRailPayment } from "./railClient.js";
import {
  createManyPayments,
  updatePayrollPaymentsStatus,
} from "./paymentService.js";
import {
  requestPayrollPayments,
  executePayrollPayments,
  checkTreasuryBalance,
} from "./contractHook.js";
import { logger } from "../utils/logger.js";
import { saveReceiptToArweave, type PayrollReceipt } from "./arweaveService.js";
import { config } from "../config/env.js";

// Demo payments (amounts in cents)
const DEMO_PAYMENTS = [
  { amount: 50000, currency: "USD", recipient: "0xFreelancer1" },
  { amount: 75000, currency: "USD", recipient: "0xFreelancer2" },
  { amount: 60000, currency: "USD", recipient: "0xFreelancer3" },
  { amount: 45000, currency: "USD", recipient: "0xFreelancer4" },
  { amount: 80000, currency: "USD", recipient: "0xFreelancer5" },
  { amount: 55000, currency: "USD", recipient: "0xFreelancer6" },
  { amount: 70000, currency: "USD", recipient: "0xFreelancer7" },
  { amount: 65000, currency: "USD", recipient: "0xFreelancer8" },
  { amount: 48000, currency: "USD", recipient: "0xFreelancer9" },
  { amount: 52000, currency: "USD", recipient: "0xFreelancer10" },
];

/**
 * Execute a demo payroll
 * Creates a payroll with 10 payments and processes them through the pipeline
 * 
 * Flow:
 * 1. Create Payroll (PENDING)
 * 2. Create Payments (PENDING)
 * 3. Request payments on-chain (ONCHAIN_REQUESTED)
 * 4. Execute payments on-chain (ONCHAIN_PAID)
 * 5. Process through Rail (RAIL_PROCESSING -> PAID) [optional]
 * 
 * @returns Complete payroll with payments
 */
export async function executePayrollDemo() {
  const total = DEMO_PAYMENTS.reduce((sum, p) => sum + p.amount, 0);
  const currency = "USD";

  // Create payroll
  const payroll = await prisma.payroll.create({
    data: {
      total,
      currency,
      status: PayrollStatus.PENDING,
    },
  });

  // Create payments
  await createManyPayments(
    DEMO_PAYMENTS.map((p) => ({
      payrollId: payroll.id,
      amount: p.amount,
      currency: p.currency,
      recipient: p.recipient,
    })),
  );

  // Check treasury balance before proceeding
  try {
    const balance = await checkTreasuryBalance(currency);
    logger.info(`Treasury balance: ${balance.formatted} ${currency}`);
  } catch (error) {
    logger.warn("Could not check treasury balance", error);
  }

  // Request payments on-chain
  try {
    logger.info("Requesting payments on-chain...");
    const requestTxHashes = await requestPayrollPayments(payroll.id);
    logger.info(`Requested ${requestTxHashes.length} payments on-chain`);
  } catch (error) {
    logger.error("Failed to request payments on-chain", error);
    throw error;
  }

  // Execute payments on-chain
  let onchainSuccess = false;
  try {
    logger.info("Executing payments on-chain...");
    const executeTxHashes = await executePayrollPayments(payroll.id);
    logger.info(`Executed ${executeTxHashes.length} payments on-chain`);
    onchainSuccess = executeTxHashes.length > 0;
    
    // If on-chain execution was successful, mark as ONCHAIN_PAID
    if (onchainSuccess) {
      await prisma.payroll.update({
        where: { id: payroll.id },
        data: { status: PayrollStatus.ONCHAIN_PAID },
      });
      await updatePayrollPaymentsStatus(payroll.id, PaymentStatus.ONCHAIN_PAID);
      logger.info("Payroll marked as ONCHAIN_PAID");
    }
  } catch (error) {
    logger.error("Failed to execute payments on-chain", error);
    // Continue even if execution fails, status will be updated accordingly
  }

  // Process through Rail (optional - can be done asynchronously)
  try {
    if (onchainSuccess) {
      await prisma.payroll.update({
        where: { id: payroll.id },
        data: { status: PayrollStatus.RAIL_PROCESSING },
      });
      await updatePayrollPaymentsStatus(payroll.id, PaymentStatus.RAIL_PROCESSING);
    }
    logger.info("Processing through Rail");

    // Call Rail API (mock)
    const railResult = await createRailPayment({
      payrollId: payroll.id,
      amount: total,
      currency,
    });

    // Final status based on Rail result
    // If Rail succeeds, mark as PAID; if Rail fails but on-chain succeeded, keep ONCHAIN_PAID
    let finalStatus: PayrollStatusType;
    let finalPaymentStatus: PaymentStatusType;
    
    if (railResult.status === "PAID") {
      finalStatus = PayrollStatus.PAID;
      finalPaymentStatus = PaymentStatus.PAID;
    } else if (onchainSuccess) {
      // On-chain succeeded but Rail failed - keep as ONCHAIN_PAID
      finalStatus = PayrollStatus.ONCHAIN_PAID;
      finalPaymentStatus = PaymentStatus.ONCHAIN_PAID;
      logger.info("Rail processing failed, but on-chain payment succeeded - keeping ONCHAIN_PAID status");
    } else {
      // Both failed
      finalStatus = PayrollStatus.FAILED;
      finalPaymentStatus = PaymentStatus.FAILED;
    }

    const updatedPayroll = await prisma.payroll.update({
      where: { id: payroll.id },
      data: { status: finalStatus },
    });
    await updatePayrollPaymentsStatus(payroll.id, finalPaymentStatus);
    logger.info(`Payroll completed with status: ${finalStatus}`);

    // Save permanent receipt to Arweave (Sovereign Agent Stack: Memory Layer)
    if (finalStatus === PayrollStatus.PAID) {
      try {
        // Fetch payroll with payments for complete receipt
        const payrollWithPayments = await prisma.payroll.findUnique({
          where: { id: payroll.id },
          include: { payments: true }
        });

        if (payrollWithPayments) {
          const receipt: PayrollReceipt = {
            payrollId: payroll.id,
            status: finalStatus,
            totalAmount: total.toString(),
            currency,
            recipientCount: payrollWithPayments.payments.length,
            network: config.network,
            treasuryContract: config.treasuryContractAddress,
            onchainTxHash: undefined, // Transaction hashes are individual per payment
            createdAt: payroll.createdAt.toISOString(),
            completedAt: new Date().toISOString(),
            version: '1.0.0',
            protocol: 'snowrail-payroll-v1',
            agentId: 'snowrail-treasury-v1',
            x402MeterId: 'payroll_execute',
          };

          const arweaveResult = await saveReceiptToArweave(receipt);
          if (arweaveResult.success) {
            logger.info(`📦 Receipt saved to Arweave: ${arweaveResult.url}`);
            // Optionally store the arweave URL in the database
            // You'd need to add arweaveUrl field to your Prisma schema
          }
        }
      } catch (arweaveError) {
        logger.warn('Failed to save receipt to Arweave, but payroll completed', arweaveError);
      }
    }
  } catch (error) {
    logger.warn("Rail processing failed, but on-chain payments were executed", error);
  }

  return getPayrollById(payroll.id);
}

// Get payroll by id with payments
export async function getPayrollById(id: string) {
  return prisma.payroll.findUnique({
    where: { id },
    include: { payments: true },
  });
}



