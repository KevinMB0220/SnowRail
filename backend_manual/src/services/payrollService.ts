import { prisma } from "../db/client";
import { logger } from "../utils/logger";
import { PayrollStatus } from "../domain/payroll";
import { PaymentStatus } from "../domain/payment";
import { createRailPayment } from "./railClient";
import {
  createManyPayments,
  updatePayrollPaymentsStatus,
  getPaymentsByPayrollId,
} from "./paymentService";

/**
 * Payroll Service
 * Orchestrates the payroll execution flow
 */

// Demo payment amounts (in cents)
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
 * 3. Mark as ONCHAIN_PAID (simulating x402 payment confirmation)
 * 4. Process through Rail (RAIL_PROCESSING -> PAID)
 * 
 * @returns Complete payroll with payments
 */
export async function executePayrollDemo() {
  logger.info("Starting demo payroll execution");

  // Calculate total
  const total = DEMO_PAYMENTS.reduce((sum, p) => sum + p.amount, 0);
  const currency = "USD";

  // Step 1: Create payroll
  const payroll = await prisma.payroll.create({
    data: {
      total,
      currency,
      status: PayrollStatus.PENDING,
    },
  });
  logger.info(`Payroll created: ${payroll.id}`);

  // Step 2: Create payments
  await createManyPayments(
    DEMO_PAYMENTS.map((p) => ({
      payrollId: payroll.id,
      amount: p.amount,
      currency: p.currency,
      recipient: p.recipient,
    }))
  );
  logger.info(`Created ${DEMO_PAYMENTS.length} payments`);

  // Step 3: Mark as ONCHAIN_PAID (x402 payment confirmed)
  await prisma.payroll.update({
    where: { id: payroll.id },
    data: { status: PayrollStatus.ONCHAIN_PAID },
  });
  await updatePayrollPaymentsStatus(payroll.id, PaymentStatus.ONCHAIN_PAID);
  logger.info("Marked as ONCHAIN_PAID");

  // Step 4: Process through Rail
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

  // Step 5: Final status based on Rail result
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

  // Return complete payroll
  return getPayrollById(payroll.id);
}

/**
 * Get payroll by ID with payments
 * @param id - Payroll ID
 * @returns Payroll with payments or null
 */
export async function getPayrollById(id: string) {
  return prisma.payroll.findUnique({
    where: { id },
    include: { payments: true },
  });
}

/**
 * Get all payrolls
 * @param limit - Maximum number of payrolls to return
 * @returns Array of payrolls with payments
 */
export async function getAllPayrolls(limit = 10) {
  return prisma.payroll.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { payments: true },
  });
}

/**
 * Update payroll status
 * @param id - Payroll ID
 * @param status - New status
 * @returns Updated payroll
 */
export async function updatePayrollStatus(id: string, status: string) {
  return prisma.payroll.update({
    where: { id },
    data: { status },
  });
}

