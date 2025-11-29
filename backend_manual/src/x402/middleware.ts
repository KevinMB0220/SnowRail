import { Request, Response, NextFunction } from "express";
import { meters, getMeter, MeterConfig } from "./metering";
import { validateXPaymentHeader } from "./validator";
import { logger } from "../utils/logger";

/**
 * x402 Protocol Middleware
 * Implements HTTP 402 Payment Required for protected endpoints
 */

// Extended request type with payment info
export interface X402Request extends Request {
  x402?: {
    meterId: string;
    meter: MeterConfig;
    paymentHeader: string;
  };
}

/**
 * x402 Protection Middleware Factory
 * Returns middleware that requires payment for the specified meter
 * 
 * @param meterId - The meter ID to use for pricing
 * @returns Express middleware function
 * 
 * Flow:
 * 1. Check for X-PAYMENT header
 * 2. If missing: respond with 402 + metering info
 * 3. If present: validate payment
 * 4. If invalid: respond with 402 + error
 * 5. If valid: attach payment info to request and continue
 */
export function x402Protect(meterId: string) {
  return async (
    req: X402Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const paymentHeader = req.header("X-PAYMENT");
    const meter = getMeter(meterId);

    // Meter not found - configuration error
    if (!meter) {
      logger.error(`Meter not found: ${meterId}`);
      res.status(500).json({
        error: "METER_NOT_CONFIGURED",
        message: `Meter ${meterId} is not configured`,
      });
      return;
    }

    // No payment header - respond with 402 and metering info
    if (!paymentHeader) {
      logger.info(`402 Payment Required for meter: ${meterId}`);
      res.status(402).json({
        error: "PAYMENT_REQUIRED",
        meterId,
        metering: {
          price: meter.price,
          asset: meter.asset,
          chain: meter.chain,
          resource: meter.resource,
          description: meter.description,
          version: meter.version,
        },
        message: `Payment required: ${meter.price} ${meter.asset} on ${meter.chain}`,
      });
      return;
    }

    // Validate the payment
    const valid = await validateXPaymentHeader(paymentHeader, meterId);

    if (!valid) {
      logger.warn(`Invalid payment for meter: ${meterId}`);
      res.status(402).json({
        error: "PAYMENT_INVALID",
        meterId,
        metering: {
          price: meter.price,
          asset: meter.asset,
          chain: meter.chain,
          resource: meter.resource,
          description: meter.description,
          version: meter.version,
        },
        message: "Payment validation failed. Please provide a valid payment proof.",
      });
      return;
    }

    // Payment valid - attach info to request and continue
    req.x402 = {
      meterId,
      meter,
      paymentHeader,
    };

    logger.info(`Payment validated for meter: ${meterId}`);
    next();
  };
}

/**
 * Optional x402 middleware - doesn't require payment but logs if present
 * Useful for endpoints that can work with or without payment
 */
export function x402Optional(meterId: string) {
  return async (
    req: X402Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const paymentHeader = req.header("X-PAYMENT");
    const meter = getMeter(meterId);

    if (paymentHeader && meter) {
      const valid = await validateXPaymentHeader(paymentHeader, meterId);
      if (valid) {
        req.x402 = {
          meterId,
          meter,
          paymentHeader,
        };
        logger.info(`Optional payment provided for meter: ${meterId}`);
      }
    }

    next();
  };
}

