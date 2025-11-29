import { prisma } from "../dbClient.js";
import { PayrollStatus } from "../domain/payroll.js";
import { PaymentStatus } from "../domain/payment.js";
import { createRailPayment } from "./railClient.js";
import {
  createManyPayments,
  updatePayrollPaymentsStatus,
} from "./paymentService.js";

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

// Execute demo payroll end-to-end
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

  // Mark ONCHAIN_PAID after x402 validation
  await prisma.payroll.update({
    where: { id: payroll.id },
    data: { status: PayrollStatus.ONCHAIN_PAID },
  });
  await updatePayrollPaymentsStatus(
    payroll.id,
    PaymentStatus.ONCHAIN_PAID,
  );

  // Rail processing
  await prisma.payroll.update({
    where: { id: payroll.id },
    data: { status: PayrollStatus.RAIL_PROCESSING },
  });
  await updatePayrollPaymentsStatus(
    payroll.id,
    PaymentStatus.RAIL_PROCESSING,
  );

  // Call Rail mock
  const railResult = await createRailPayment({
    payrollId: payroll.id,
    amount: total,
    currency,
  });

  const finalStatus =
    railResult.status === "PAID"
      ? PayrollStatus.PAID
      : PayrollStatus.FAILED;
  const finalPaymentStatus =
    railResult.status === "PAID"
      ? PaymentStatus.PAID
      : PaymentStatus.FAILED;

  await prisma.payroll.update({
    where: { id: payroll.id },
    data: { status: finalStatus },
  });
  await updatePayrollPaymentsStatus(
    payroll.id,
    finalPaymentStatus,
  );

  return getPayrollById(payroll.id);
}

// Get payroll by id with payments
export async function getPayrollById(id: string) {
  return prisma.payroll.findUnique({
    where: { id },
    include: { payments: true },
  });
}


