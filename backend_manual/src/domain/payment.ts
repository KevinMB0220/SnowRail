/**
 * Payment Domain Types
 * Defines status constants and types for individual payments
 */

// Payment status constants
export const PaymentStatus = {
  PENDING: "PENDING",
  ONCHAIN_PAID: "ONCHAIN_PAID",
  RAIL_PROCESSING: "RAIL_PROCESSING",
  PAID: "PAID",
  FAILED: "FAILED",
} as const;

export type PaymentStatusType = (typeof PaymentStatus)[keyof typeof PaymentStatus];

// Payment type (matches Prisma model)
export type Payment = {
  id: string;
  payrollId: string;
  amount: number;
  currency: string;
  status: PaymentStatusType;
  recipient: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// API response type for payment
export type PaymentResponse = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  recipient: string | null;
  createdAt: string;
  updatedAt: string;
};

