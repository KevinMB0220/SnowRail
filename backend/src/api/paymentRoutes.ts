/**
 * Integrated Payment Routes
 * Complete flow: Rail + Agent + Contracts + Facilitator
 * 
 * This endpoint replaces the old agent/facilitator test endpoints
 * and provides a complete payment processing flow.
 */

import type { Express, Request, Response } from "express";
import { x402Protect, type X402Request } from "../x402/middleware.js";
import { logger } from "../utils/logger.js";
import { createRailPayment } from "../services/railClient.js";
import {
  requestPayrollPayments,
  executePayrollPayments,
  checkTreasuryBalance,
} from "../services/contractHook.js";
import { prisma } from "../dbClient.js";
import { PayrollStatus, type PayrollStatusType } from "../domain/payroll.js";
import { PaymentStatus, type PaymentStatusType } from "../domain/payment.js";
import { createManyPayments, updatePayrollPaymentsStatus } from "../services/paymentService.js";
import { getRailAccessToken } from "../services/railClient.js";
import { config } from "../config/env.js";

const METER_ID = "payment_process";

// Types for the integrated payment request
export type PaymentRequest = {
  // Rail customer information
  customer: {
    first_name: string;
    last_name: string;
    email_address: string;
    telephone_number?: string;
    mailing_address: {
      address_line1: string;
      city: string;
      state: string;
      postal_code: string;
      country_code: string;
    };
  };
  // Payment details
  payment: {
    amount: number; // Amount in cents
    currency: string; // USD, etc.
    recipient?: string; // Optional blockchain address
    description?: string;
  };
  // Rail account configuration (optional, will use env defaults if not provided)
  rail?: {
    source_account_id?: string;
    counterparty_id?: string;
    withdrawal_rail?: "ACH" | "FEDWIRE" | "SEPA_CT" | "SWIFT";
  };
};

// Response type
export type PaymentResponse = {
  success: boolean;
  payrollId: string;
  status: string;
  steps: {
    payroll_created: boolean;
    payments_created: boolean;
    treasury_checked: boolean;
    onchain_requested: boolean;
    onchain_executed: boolean;
    rail_processed: boolean;
  };
  transactions?: {
    request_tx_hashes?: string[];
    execute_tx_hashes?: string[];
  };
  rail?: {
    withdrawal_id?: string;
    status?: string;
  };
  errors?: Array<{
    step: string;
    error: string;
  }>;
};

/**
 * POST /api/payment/process
 * Complete payment processing flow:
 * 1. Create payroll and payments in DB
 * 2. Check treasury balance
 * 3. Request payments on-chain (via contract)
 * 4. Execute payments on-chain (via contract)
 * 5. Process through Rail API
 * 
 * Protected by x402 middleware (requires payment proof)
 */
export function registerPaymentRoutes(app: Express) {
  app.post(
    "/api/payment/process",
    x402Protect(METER_ID),
    async (req: X402Request, res: Response) => {
      const startTime = Date.now();
      const requestId = `payment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const errors: Array<{ step: string; error: string }> = [];
      const steps = {
        payroll_created: false,
        payments_created: false,
        treasury_checked: false,
        onchain_requested: false,
        onchain_executed: false,
        rail_processed: false,
      };

      let payrollId: string | null = null;
      const transactions: {
        request_tx_hashes?: string[];
        execute_tx_hashes?: string[];
      } = {};
      const railResult: {
        withdrawal_id?: string;
        status?: string;
      } = {};

      try {
        logger.info(`[${requestId}] Payment processing request received`, {
          timestamp: new Date().toISOString(),
          body: {
            customer: {
              name: `${req.body?.customer?.first_name} ${req.body?.customer?.last_name}`,
              email: req.body?.customer?.email_address,
            },
            amount: req.body?.payment?.amount,
            currency: req.body?.payment?.currency,
          },
        });
        // Validate request body
        if (!req.body) {
          logger.error(`[${requestId}] Request body is missing`);
          return res.status(400).json({
            success: false,
            error: "INVALID_REQUEST",
            message: "Request body is required",
          });
        }

        const paymentRequest = req.body as PaymentRequest;
        
        if (!paymentRequest.customer || !paymentRequest.payment) {
          logger.error(`[${requestId}] Missing required fields`, {
            hasCustomer: !!paymentRequest.customer,
            hasPayment: !!paymentRequest.payment,
          });
          return res.status(400).json({
            success: false,
            error: "INVALID_REQUEST",
            message: "Missing required fields: customer and payment",
          });
        }

        if (!paymentRequest.customer.first_name || !paymentRequest.customer.last_name) {
          logger.error(`[${requestId}] Missing customer name fields`);
          return res.status(400).json({
            success: false,
            error: "INVALID_REQUEST",
            message: "Customer first_name and last_name are required",
          });
        }

        if (!paymentRequest.payment.amount || paymentRequest.payment.amount <= 0) {
          logger.error(`[${requestId}] Invalid payment amount`, {
            amount: paymentRequest.payment.amount,
          });
          return res.status(400).json({
            success: false,
            error: "INVALID_REQUEST",
            message: "Payment amount must be greater than 0",
          });
        }

        // Step 1: Create payroll
        logger.info(`[${requestId}] Step 1: Creating payroll...`);
        try {
          const payroll = await prisma.payroll.create({
            data: {
              total: paymentRequest.payment.amount,
              currency: paymentRequest.payment.currency || "USD",
              status: PayrollStatus.PENDING,
            },
          });
          payrollId = payroll.id;
          steps.payroll_created = true;
          logger.info(`[${requestId}] Payroll created: ${payrollId}`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          logger.error(`[${requestId}] Failed to create payroll:`, error);
          errors.push({ step: "payroll_created", error: errorMsg });
          throw error;
        }

        // Step 2: Create payment record
        logger.info(`[${requestId}] Step 2: Creating payment record...`);
        try {
          await createManyPayments([
            {
              payrollId: payrollId!,
              amount: paymentRequest.payment.amount,
              currency: paymentRequest.payment.currency || "USD",
              recipient: paymentRequest.payment.recipient,
            },
          ]);
          steps.payments_created = true;
          logger.info(`[${requestId}] Payment record created`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          logger.error(`[${requestId}] Failed to create payment:`, error);
          errors.push({ step: "payments_created", error: errorMsg });
          throw error;
        }

        // Step 3: Check treasury balance
        logger.info(`[${requestId}] Step 3: Checking treasury balance...`);
        try {
          const balance = await checkTreasuryBalance(paymentRequest.payment.currency || "USD");
          steps.treasury_checked = true;
          logger.info(`[${requestId}] Treasury balance: ${balance.formatted}`);
          
          // Check if balance is sufficient
          const requiredAmount = paymentRequest.payment.amount / 100; // Convert cents to dollars
          const requiredAmountInTokens = BigInt(Math.floor(requiredAmount * 1e6)); // Convert to token units (6 decimals)
          if (balance.balance < requiredAmountInTokens) {
            logger.warn(`[${requestId}] Insufficient treasury balance. Required: ${requiredAmount} USD, Available: ${balance.formatted} USD`);
            // Continue anyway - the contract will fail if insufficient
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          logger.warn(`[${requestId}] Could not check treasury balance:`, error);
          errors.push({ step: "treasury_checked", error: errorMsg });
          // Continue - this is not critical
        }

        // Step 4: Request payments on-chain
        logger.info(`[${requestId}] Step 4: Requesting payments on-chain...`);
        try {
          const requestTxHashes = await requestPayrollPayments(payrollId!);
          transactions.request_tx_hashes = requestTxHashes;
          steps.onchain_requested = true;
          logger.info(`[${requestId}] Payments requested on-chain. TXs: ${requestTxHashes.join(", ")}`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          logger.error(`[${requestId}] Failed to request payments on-chain:`, error);
          errors.push({ step: "onchain_requested", error: errorMsg });
          // Continue - we can still process through Rail
        }

        // Step 5: Execute payments on-chain
        logger.info(`[${requestId}] Step 5: Executing payments on-chain...`);
        try {
          const executeTxHashes = await executePayrollPayments(payrollId!);
          transactions.execute_tx_hashes = executeTxHashes;
          steps.onchain_executed = true;
          logger.info(`[${requestId}] Payments executed on-chain. TXs: ${executeTxHashes.join(", ")}`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          logger.error(`[${requestId}] Failed to execute payments on-chain:`, error);
          errors.push({ step: "onchain_executed", error: errorMsg });
          // Continue - we can still process through Rail
        }

        // Step 6: Process through Rail
        logger.info(`[${requestId}] Step 6: Processing through Rail API...`);
        try {
          const sourceAccountId = paymentRequest.rail?.source_account_id || process.env.RAIL_SOURCE_ACCOUNT_ID;
          const counterpartyId = paymentRequest.rail?.counterparty_id || process.env.RAIL_COUNTERPARTY_ID;

          if (!sourceAccountId || !counterpartyId) {
            logger.warn(`[${requestId}] Rail accounts not configured. Skipping Rail processing.`);
            logger.warn(`[${requestId}] To enable Rail processing, set RAIL_SOURCE_ACCOUNT_ID and RAIL_COUNTERPARTY_ID in .env`);
            logger.warn(`[${requestId}] Run: npx tsx test-rail-get-existing.ts to find existing accounts/counterparties`);
            errors.push({
              step: "rail_processed",
              error: "Rail accounts not configured. Payment was processed on-chain but not through Rail.",
            });
            // Don't mark as failed - on-chain payment was successful
            steps.rail_processed = false;
          } else {
            // Update status to RAIL_PROCESSING
            await prisma.payroll.update({
              where: { id: payrollId! },
              data: { status: PayrollStatus.RAIL_PROCESSING },
            });
            await updatePayrollPaymentsStatus(payrollId!, PaymentStatus.RAIL_PROCESSING);

            // Create Rail withdrawal
            const railPaymentResult = await createRailPayment({
              payrollId: payrollId!,
              amount: paymentRequest.payment.amount,
              currency: paymentRequest.payment.currency || "USD",
              recipient: paymentRequest.customer.email_address, // Use email as recipient identifier
              sourceAccountId,
              counterpartyId,
            });

            railResult.withdrawal_id = railPaymentResult.id;
            railResult.status = railPaymentResult.status;

            // Update final status based on Rail result
            // If on-chain was successful, prioritize that - Rail is optional
            let finalStatus: PayrollStatusType;
            let finalPaymentStatus: PaymentStatusType;
            
            if (railPaymentResult.status === "PAID") {
              finalStatus = PayrollStatus.PAID;
              finalPaymentStatus = PaymentStatus.PAID;
            } else if (railPaymentResult.status === "FAILED") {
              // If Rail failed but on-chain succeeded, mark as ONCHAIN_PAID (not FAILED)
              if (steps.onchain_executed) {
                finalStatus = PayrollStatus.ONCHAIN_PAID;
                finalPaymentStatus = PaymentStatus.ONCHAIN_PAID;
              } else {
                // Both failed
                finalStatus = PayrollStatus.FAILED;
                finalPaymentStatus = PaymentStatus.FAILED;
              }
            } else {
              // PENDING, PROCESSING, etc. - valid states
              // If on-chain succeeded, mark as ONCHAIN_PAID, otherwise RAIL_PROCESSING
              if (steps.onchain_executed) {
                finalStatus = PayrollStatus.ONCHAIN_PAID;
                finalPaymentStatus = PaymentStatus.ONCHAIN_PAID;
              } else {
                finalStatus = PayrollStatus.RAIL_PROCESSING;
                finalPaymentStatus = PaymentStatus.RAIL_PROCESSING;
              }
            }

            await prisma.payroll.update({
              where: { id: payrollId! },
              data: { status: finalStatus },
            });
            await updatePayrollPaymentsStatus(payrollId!, finalPaymentStatus);

            steps.rail_processed = true;
            logger.info(`[${requestId}] Rail processing completed. Withdrawal ID: ${railPaymentResult.id}, Status: ${railPaymentResult.status}`);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          logger.error(`[${requestId}] Failed to process through Rail:`, error);
          errors.push({ step: "rail_processed", error: errorMsg });
          // Don't update status to failed - on-chain payment may have succeeded
          // Just log the error and continue
        }

        // Get final payroll status
        const finalPayroll = await prisma.payroll.findUnique({
          where: { id: payrollId! },
        });

        const duration = Date.now() - startTime;
        logger.info(`[${requestId}] Payment processing completed in ${duration}ms`, {
          payrollId,
          status: finalPayroll?.status,
          steps,
          errors: errors.length,
        });

        // Return response
        // Success if on-chain was executed OR rail was processed
        // (Rail is optional if accounts aren't configured)
        const isSuccess = steps.onchain_executed || steps.rail_processed || (steps.onchain_requested && errors.length === 0);
        
        const response: PaymentResponse = {
          success: isSuccess,
          payrollId: payrollId!,
          status: finalPayroll?.status || PayrollStatus.FAILED,
          steps,
          transactions: Object.keys(transactions).length > 0 ? transactions : undefined,
          rail: Object.keys(railResult).length > 0 ? railResult : undefined,
          errors: errors.length > 0 ? errors : undefined,
        };

        return res.status(200).json(response);
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const errorStack = error instanceof Error ? error.stack : undefined;
        
        logger.error(`[${requestId}] Payment processing failed after ${duration}ms:`, {
          error: errorMessage,
          stack: errorStack,
          payrollId: payrollId || null,
          steps,
          errors,
        });

        // If payroll was created, try to update its status to failed
        if (payrollId) {
          try {
            await prisma.payroll.update({
              where: { id: payrollId },
              data: { status: PayrollStatus.FAILED },
            });
          } catch (updateError) {
            logger.error(`[${requestId}] Failed to update payroll status to FAILED:`, updateError);
          }
        }

        return res.status(500).json({
          success: false,
          error: "PROCESSING_FAILED",
          message: errorMessage,
          payrollId: payrollId || undefined,
          steps,
          errors: errors.length > 0 ? errors : [{ step: "unknown", error: errorMessage }],
        });
      }
    },
  );
}

