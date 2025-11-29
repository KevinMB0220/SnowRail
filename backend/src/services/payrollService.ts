import { prisma } from "../dbClient.js";
import { PayrollStatus } from "../domain/payroll.js";
import { PaymentStatus } from "../domain/payment.js";
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
  try {
    logger.info("Executing payments on-chain...");
    const executeTxHashes = await executePayrollPayments(payroll.id);
    logger.info(`Executed ${executeTxHashes.length} payments on-chain`);
  } catch (error) {
    logger.error("Failed to execute payments on-chain", error);
    // Continue even if execution fails, status will be updated accordingly
  }

  // Process through Rail (optional - can be done asynchronously)
  try {
    await prisma.payroll.update({
      where: { id: payroll.id },
      data: { status: PayrollStatus.RAIL_PROCESSING },
    });
    await updatePayrollPaymentsStatus(payroll.id, PaymentStatus.RAIL_PROCESSING);
    logger.info("Processing through Rail");

    // Call Rail API (mock)
    const railResult = await createRailPayment({
      payrollId: payroll.id,
      amount: total,
      currency,
    });

    // Final status based on Rail result
    const finalStatus =
      railResult.status === "PAID" ? PayrollStatus.PAID : PayrollStatus.FAILED;
    const finalPaymentStatus =
      railResult.status === "PAID" ? PaymentStatus.PAID : PaymentStatus.FAILED;

    await prisma.payroll.update({
      where: { id: payroll.id },
      data: { status: finalStatus },
    });
    await updatePayrollPaymentsStatus(payroll.id, finalPaymentStatus);
    logger.info(`Payroll completed with status: ${finalStatus}`);
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


