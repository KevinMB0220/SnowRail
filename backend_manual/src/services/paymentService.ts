import { prisma } from "../db/client";
import { logger } from "../utils/logger";
import { PaymentStatus } from "../domain/payment";

/**
 * Payment Service
 * Handles individual payment CRUD operations
 */

// Create payment input type
export type CreatePaymentInput = {
  payrollId: string;
  amount: number;
  currency: string;
  recipient?: string;
};

/**
 * Create a new payment
 * @param input - Payment creation input
 * @returns Created payment
 */
export async function createPayment(input: CreatePaymentInput) {
  logger.debug(`Creating payment for payroll: ${input.payrollId}`);
  
  return prisma.payment.create({
    data: {
      payrollId: input.payrollId,
      amount: input.amount,
      currency: input.currency,
      status: PaymentStatus.PENDING,
      recipient: input.recipient,
    },
  });
}

/**
 * Create multiple payments at once
 * @param inputs - Array of payment inputs
 * @returns Created payments count
 */
export async function createManyPayments(inputs: CreatePaymentInput[]) {
  logger.debug(`Creating ${inputs.length} payments`);
  
  return prisma.payment.createMany({
    data: inputs.map((input) => ({
      payrollId: input.payrollId,
      amount: input.amount,
      currency: input.currency,
      status: PaymentStatus.PENDING,
      recipient: input.recipient,
    })),
  });
}

/**
 * Get payment by ID
 * @param id - Payment ID
 * @returns Payment or null
 */
export async function getPaymentById(id: string) {
  return prisma.payment.findUnique({
    where: { id },
  });
}

/**
 * Get all payments for a payroll
 * @param payrollId - Payroll ID
 * @returns Array of payments
 */
export async function getPaymentsByPayrollId(payrollId: string) {
  return prisma.payment.findMany({
    where: { payrollId },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Update payment status
 * @param id - Payment ID
 * @param status - New status
 * @returns Updated payment
 */
export async function updatePaymentStatus(id: string, status: string) {
  logger.debug(`Updating payment ${id} status to: ${status}`);
  
  return prisma.payment.update({
    where: { id },
    data: { status },
  });
}

/**
 * Update multiple payments status
 * @param ids - Array of payment IDs
 * @param status - New status
 * @returns Updated count
 */
export async function updateManyPaymentsStatus(ids: string[], status: string) {
  logger.debug(`Updating ${ids.length} payments to status: ${status}`);
  
  return prisma.payment.updateMany({
    where: { id: { in: ids } },
    data: { status },
  });
}

/**
 * Update all payments in a payroll
 * @param payrollId - Payroll ID
 * @param status - New status
 * @returns Updated count
 */
export async function updatePayrollPaymentsStatus(
  payrollId: string,
  status: string
) {
  logger.debug(`Updating all payments in payroll ${payrollId} to: ${status}`);
  
  return prisma.payment.updateMany({
    where: { payrollId },
    data: { status },
  });
}

