import { Request, Response } from "express";
import { executePayrollDemo, getPayrollById } from "../services/payrollService";
import { logger } from "../utils/logger";
import { NotFoundError, formatErrorResponse } from "../utils/errors";
import { X402Request } from "../x402/middleware";

/**
 * Payroll Controller
 * Handles HTTP requests for payroll operations
 */

/**
 * POST /api/payroll/execute
 * Execute a demo payroll (protected by x402)
 */
export async function executePayroll(
  req: X402Request,
  res: Response
): Promise<void> {
  try {
    logger.info("Executing payroll demo");

    // x402 payment info available if middleware passed
    if (req.x402) {
      logger.info(`Payment received for meter: ${req.x402.meterId}`);
    }

    // Execute the demo payroll
    const payroll = await executePayrollDemo();

    if (!payroll) {
      res.status(500).json({
        error: "EXECUTION_FAILED",
        message: "Failed to execute payroll",
      });
      return;
    }

    // Format response
    res.status(200).json({
      success: true,
      payrollId: payroll.id,
      status: payroll.status,
      total: payroll.total,
      currency: payroll.currency,
      paymentsCount: payroll.payments.length,
      payments: payroll.payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        recipient: p.recipient,
      })),
      createdAt: payroll.createdAt.toISOString(),
    });
  } catch (error) {
    logger.error("Failed to execute payroll", error);
    const errorResponse = formatErrorResponse(error);
    res.status(errorResponse.statusCode).json(errorResponse);
  }
}

/**
 * GET /api/payroll/:id
 * Get payroll details by ID
 */
export async function getPayroll(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    logger.debug(`Fetching payroll: ${id}`);

    const payroll = await getPayrollById(id);

    if (!payroll) {
      throw new NotFoundError(`Payroll not found: ${id}`);
    }

    res.status(200).json({
      id: payroll.id,
      total: payroll.total,
      currency: payroll.currency,
      status: payroll.status,
      createdAt: payroll.createdAt.toISOString(),
      updatedAt: payroll.updatedAt.toISOString(),
      payments: payroll.payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        recipient: p.recipient,
        createdAt: p.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    logger.error("Failed to get payroll", error);
    const errorResponse = formatErrorResponse(error);
    res.status(errorResponse.statusCode).json(errorResponse);
  }
}

