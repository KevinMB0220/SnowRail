/**
 * Payroll Domain Types
 * Defines status constants and types for payroll operations
 */

// Payroll status constants
export const PayrollStatus = {
  PENDING: "PENDING",
  ONCHAIN_PAID: "ONCHAIN_PAID",
  RAIL_PROCESSING: "RAIL_PROCESSING",
  PAID: "PAID",
  FAILED: "FAILED",
} as const;

export type PayrollStatusType = (typeof PayrollStatus)[keyof typeof PayrollStatus];

// Payroll type (matches Prisma model)
export type Payroll = {
  id: string;
  total: number;
  currency: string;
  status: PayrollStatusType;
  createdAt: Date;
  updatedAt: Date;
};

// Payroll with payments
export type PayrollWithPayments = Payroll & {
  payments: import("./payment").Payment[];
};

// API response type
export type PayrollResponse = {
  id: string;
  total: number;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  payments: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    recipient: string | null;
  }[];
};

