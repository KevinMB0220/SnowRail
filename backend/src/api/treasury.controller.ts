import { Request, Response } from "express";
import { checkTreasuryBalance } from "../services/contractHook.js";
import { logger } from "../utils/logger.js";
import { formatErrorResponse } from "../utils/errors.js";
import { x402Protect, type X402Request } from "../x402/middleware.js";
import type { ExampleService } from "../ExampleService.js";
import type { MerchantExecutor } from "../MerchantExecutor.js";
import {
  EventQueue,
  Message,
  RequestContext,
  Task,
  TaskState,
} from "../x402Types.js";
import type { PaymentPayload } from "x402/types";

/**
 * Treasury Controller
 * Handles HTTP requests for treasury operations
 */

// These will be injected from server.ts
let exampleService: ExampleService | null = null;
let merchantExecutor: MerchantExecutor | null = null;

/**
 * Initialize the controller with service dependencies
 */
export function initializeTreasuryController(
  service: ExampleService,
  executor: MerchantExecutor
): void {
  exampleService = service;
  merchantExecutor = executor;
}

/**
 * GET /api/treasury/balance
 * Get treasury balance for a currency (default: USD)
 */
export async function getTreasuryBalance(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const currency = (req.query.currency as string) || "USD";
    logger.debug(`Fetching treasury balance for currency: ${currency}`);

    const balance = await checkTreasuryBalance(currency);

    res.status(200).json({
      currency,
      balance: balance.balance.toString(),
      formatted: balance.formatted,
      decimals: balance.decimals,
    });
  } catch (error) {
    logger.error("Failed to get treasury balance", error);
    const errorResponse = formatErrorResponse(error);
    res.status(errorResponse.statusCode).json(errorResponse);
  }
}

/**
 * POST /api/treasury/test
 * Test Treasury contract operations (protected by x402)
 * 
 * Flow:
 * 1. Middleware x402Protect validates payment with facilitator
 * 2. Agent receives the request
 * 3. Agent validates payment with facilitator (via MerchantExecutor)
 * 4. Agent executes contract operations
 * 5. Returns transaction hashes and results
 */
export async function testContract(
  req: X402Request,
  res: Response
): Promise<void> {
  try {
    if (!exampleService || !merchantExecutor) {
      throw new Error("Treasury controller not initialized");
    }

    logger.info("🧪 Contract test requested via agent");

    // Create a task for the agent
    const taskId = `contract-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const contextId = `context-${Date.now()}`;

    // Create payment payload from X-PAYMENT header
    // For demo-token, skip payment validation (already validated by middleware)
    const paymentHeader = req.x402?.paymentHeader || "";
    let paymentPayload: PaymentPayload | undefined;

    if (paymentHeader && paymentHeader !== "demo-token") {
      // Try to parse the payment proof as JSON
      try {
        const proof = JSON.parse(paymentHeader);
        // Ensure proof has the correct structure
        if (proof.authorization && proof.signature) {
          paymentPayload = {
            x402Version: 1,
            network: req.x402?.meter.chain as any,
            scheme: "exact",
            payload: {
              signature: proof.signature,
              authorization: proof.authorization,
            },
          };
        }
      } catch {
        // If not valid JSON or structure, skip payment payload
        // Payment was already validated by middleware
        logger.warn("Could not parse payment header, skipping payment validation in agent");
      }
    }

    // Create message with contract test request
    const message: Message = {
      messageId: `msg-${Date.now()}`,
      role: "user",
      parts: [
        {
          kind: "text",
          text: "test contract",
        },
      ],
      metadata: {
        "agent.id": taskId,
        "contract.test": true,
        ...(paymentPayload
          ? {
              "x402.payment.payload": paymentPayload,
              "x402.payment.status": "payment-submitted",
            }
          : {}),
      },
    };

    // Create task
    const task: Task = {
      id: taskId,
      contextId,
      status: {
        state: TaskState.INPUT_REQUIRED,
        message: message,
      },
      metadata: {
        "contract.test": true,
      },
    };

    // Create request context
    const context: RequestContext = {
      taskId: task.id,
      contextId: task.contextId,
      currentTask: task,
      message: message,
    };

    // Create event queue
    const events: Task[] = [];
    const eventQueue: EventQueue = {
      enqueueEvent: async (event: Task) => {
        events.push(event);
      },
    };

    // Validate payment with facilitator via MerchantExecutor (if payment provided)
    if (paymentPayload) {
      logger.info("🔍 Agent validating payment with facilitator...");
      const verifyResult = await merchantExecutor.verifyPayment(paymentPayload);

      if (!verifyResult.isValid) {
        const errorReason = verifyResult.invalidReason || "Invalid payment";
        logger.warn(`❌ Payment validation failed: ${errorReason}`);
        res.status(402).json({
          success: false,
          error: "Payment verification failed",
          reason: errorReason,
        });
        return;
      }

      logger.info(`✅ Payment validated by facilitator. Payer: ${verifyResult.payer}`);
    }

    // Execute agent with contract test request
    logger.info("🤖 Agent executing contract test operations...");
    await exampleService.execute(context, eventQueue);

    // Get the final task from events
    const finalTask = events[events.length - 1] || task;

    // Extract results from task metadata
    const testResults = finalTask.status.message?.metadata?.["contract.test.results"] || [];
    const transactionHashes =
      finalTask.status.message?.metadata?.["contract.test.transactions"] || [];
    const summary =
      finalTask.status.message?.metadata?.["contract.test.summary"] || {
        total: 0,
        successful: 0,
        failed: 0,
      };

    // Settle payment if it was validated
    let settlementResult = null;
    if (paymentPayload) {
      logger.info("💰 Agent settling payment...");
      settlementResult = await merchantExecutor.settlePayment(paymentPayload);
      if (settlementResult.success && settlementResult.transaction) {
        logger.info(`✅ Payment settled. Transaction: ${settlementResult.transaction}`);
      }
    }

    // Return results with transaction hashes
    res.status(200).json({
      success: true,
      results: testResults,
      transactionHashes: transactionHashes,
      summary: summary,
      ...(settlementResult?.transaction
        ? { paymentTransaction: settlementResult.transaction }
        : {}),
    });
  } catch (error) {
    logger.error("Failed to execute contract test via agent", error);
    const errorResponse = formatErrorResponse(error);
    res.status(errorResponse.statusCode).json({
      success: false,
      error: errorResponse.error,
      message: errorResponse.message,
    });
  }
}

