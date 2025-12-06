import { prisma } from "../dbClient.js";
import { PaymentStatus } from "../domain/payment.js";

// Input type to create payments for a payroll
export type CreatePaymentInput = {
  payrollId: string;
  amount: number;
  currency: string;
  recipient?: string;
};

// Create many payments for a given payroll
export async function createManyPayments(
  inputs: CreatePaymentInput[],
) {
  return prisma.outboundPayment.createMany({
    data: inputs.map((p) => ({
      payrollId: p.payrollId,
      amount: p.amount,
      currency: p.currency,
      status: PaymentStatus.PENDING,
      recipient: p.recipient,
    })),
  });
}

// Update status for all payments of a payroll
export async function updatePayrollPaymentsStatus(
  payrollId: string,
  status: string,
) {
  return prisma.outboundPayment.updateMany({
    where: { payrollId },
    data: { status },
  });
}

// Get all payments for a payroll (used by payroll detail)
export async function getPaymentsByPayrollId(payrollId: string) {
  return prisma.outboundPayment.findMany({
    where: { payrollId },
    orderBy: { createdAt: "asc" },
  });
}


