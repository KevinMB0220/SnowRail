import { logger } from "../utils/logger";
import { config } from "../config/env";

/**
 * Rail Client Service
 * Mock implementation for Rail payment network integration
 * TODO: Replace with actual Rail API integration
 */

// Input type for creating a Rail payment
export type RailPaymentInput = {
  payrollId: string;
  amount: number;
  currency: string;
  recipientId?: string;
  recipientBank?: {
    country: string;
    accountNumber: string;
    routingNumber?: string;
  };
};

// Result type for Rail payment
export type RailPaymentResult = {
  id: string;
  status: "PROCESSING" | "PAID" | "FAILED";
  createdAt: string;
  estimatedCompletion?: string;
  failureReason?: string;
};

// Rail payment status check result
export type RailPaymentStatus = {
  id: string;
  status: "PROCESSING" | "PAID" | "FAILED";
  updatedAt: string;
};

/**
 * Create a Rail payment (MOCK)
 * @param input - Payment input data
 * @returns Promise<RailPaymentResult>
 * 
 * TODO: Implement actual Rail API call
 * TODO: Add webhook handling for async status updates
 */
export async function createRailPayment(
  input: RailPaymentInput
): Promise<RailPaymentResult> {
  logger.info(`Creating Rail payment for payroll: ${input.payrollId}`);

  // Simulate API delay (1-2 seconds)
  const delay = 1000 + Math.random() * 1000;
  await new Promise((resolve) => setTimeout(resolve, delay));

  // Generate mock payment ID
  const paymentId = `rail_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Mock: 90% success rate
  const isSuccess = Math.random() > 0.1;

  if (!isSuccess) {
    logger.warn(`Rail payment failed for payroll: ${input.payrollId}`);
    return {
      id: paymentId,
      status: "FAILED",
      createdAt: new Date().toISOString(),
      failureReason: "MOCK_RANDOM_FAILURE",
    };
  }

  logger.info(`Rail payment created: ${paymentId}`);
  return {
    id: paymentId,
    status: "PAID", // For MVP, immediately mark as paid
    createdAt: new Date().toISOString(),
    estimatedCompletion: new Date(Date.now() + 86400000).toISOString(), // +24h
  };
}

/**
 * Check Rail payment status (MOCK)
 * @param paymentId - Rail payment ID
 * @returns Promise<RailPaymentStatus>
 */
export async function getRailPaymentStatus(
  paymentId: string
): Promise<RailPaymentStatus> {
  logger.debug(`Checking Rail payment status: ${paymentId}`);

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Mock: Always return PAID for existing payments
  return {
    id: paymentId,
    status: "PAID",
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Cancel a Rail payment (MOCK)
 * @param paymentId - Rail payment ID
 * @returns Promise<boolean>
 */
export async function cancelRailPayment(paymentId: string): Promise<boolean> {
  logger.info(`Cancelling Rail payment: ${paymentId}`);

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Mock: Always succeed
  return true;
}

