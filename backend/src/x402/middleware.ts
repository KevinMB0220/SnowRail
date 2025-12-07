import type { Request, Response, NextFunction } from "express";
import { getMeter, type MeterConfig } from "./metering.js";
import { validateXPaymentHeader } from "./validator.js";

// Extended request type with x402 metadata
export interface X402Request extends Request {
  x402?: {
    meterId: string;
    meter: MeterConfig;
    paymentHeader: string;
  };
}

/**
 * x402Protect
 * Minimal HTTP 402 + X-PAYMENT middleware for resource-level metering.
 *
 * Flow:
 * - If no X-PAYMENT header → 402 with 8004 metering info
 * - If invalid header      → 402 with error + metering
 * - If valid               → attaches x402 data to request and calls next()
 */
export function x402Protect(meterId: string) {
  return async (
    req: X402Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const paymentHeader = req.get("X-PAYMENT") || req.headers["x-payment"] as string | undefined;
    const meter = getMeter(meterId);

    if (!meter) {
      res.status(500).json({
        error: "METER_NOT_CONFIGURED",
        meterId,
      });
      return;
    }

    // No payment → 402 + metering info (8004)
    if (!paymentHeader) {
      res.status(402).json({
        error: "PAYMENT_REQUIRED",
        meterId,
        metering: meter,
      });
      return;
    }

    // Validate X-PAYMENT
    const valid = await validateXPaymentHeader(paymentHeader, meterId);
    if (!valid) {
      res.status(402).json({
        error: "PAYMENT_INVALID",
        meterId,
        metering: meter,
      });
      return;
    }

    req.x402 = { meterId, meter, paymentHeader };
    next();
  };
}


