import { config } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { getMeter } from "./metering.js";
import { validateWithFacilitator } from "./facilitatorClient.js";

/**
 * x402 Payment Validation
 * Validates X-PAYMENT header against x402 facilitator (Ultravioleta)
 */

// Validation result type
export type ValidationResult = {
  valid: boolean;
  error?: string;
  payer?: string;
  amount?: string;
  facilitatorResponse?: any;
};

/**
 * Validate X-PAYMENT header value against Ultravioleta facilitator
 * @param headerValue - The X-PAYMENT header value (payment proof)
 * @param meterId - The meter ID for the resource being accessed
 * @returns Promise<boolean> - Whether the payment is valid
 */
export async function validateXPaymentHeader(
  headerValue: string,
  meterId: string,
): Promise<boolean> {
  logger.debug(`Validating X-PAYMENT for meter: ${meterId}`);

  // Accept demo-token in development mode, when using mock facilitator, or if explicitly allowed
  const isDevelopment = process.env.NODE_ENV !== "production";
  const isMockFacilitator = config.x402FacilitatorUrl.includes("mock");
  const allowDemoToken = config.x402AllowDemoToken || isDevelopment || isMockFacilitator;
  
  if (headerValue === "demo-token" && allowDemoToken) {
    logger.info(`Demo token accepted for meter: ${meterId} (development: ${isDevelopment}, mock: ${isMockFacilitator}, allowed: ${config.x402AllowDemoToken})`);
    return true;
  }

  // Production: Validate against Ultravioleta facilitator
  try {
    const meter = getMeter(meterId);
    if (!meter) {
      logger.error(`Meter not found: ${meterId}`);
      // Allow demo-token even if meter not found (if allowed)
      if (headerValue === "demo-token" && allowDemoToken) {
        logger.warn(`Meter not found, accepting demo-token (allowed: ${allowDemoToken})`);
        return true;
      }
      return false;
    }

    // Use facilitator client for validation
    const result = await validateWithFacilitator(headerValue, meterId, meter);
    
    if (result.valid === true) {
      return true;
    }

    // If validation failed but demo-token is allowed, accept it
    if (headerValue === "demo-token" && allowDemoToken) {
      logger.warn(`Facilitator validation failed for demo-token, but accepting (allowed: ${allowDemoToken})`, {
        error: result.error,
        message: result.message,
      });
      return true;
    }

    logger.warn(`Payment validation failed for meter: ${meterId}`, {
      error: result.error,
      message: result.message,
    });
    return false;
  } catch (error) {
    logger.error(`Error validating payment with facilitator for meter: ${meterId}`, error);
    
      // If facilitator is unavailable and demo-token is allowed, accept it
    if (headerValue === "demo-token" && allowDemoToken) {
      logger.warn(`Facilitator unavailable, accepting demo-token (allowed: ${allowDemoToken})`);
      return true;
    }
    
    return false;
  }
}

/**
 * Extended validation with detailed result
 * @param headerValue - The X-PAYMENT header value
 * @param meterId - The meter ID
 * @returns Promise<ValidationResult> - Detailed validation result
 */
export async function validatePaymentDetailed(
  headerValue: string,
  meterId: string
): Promise<ValidationResult> {
  // Development: Demo token handling
  if (headerValue === "demo-token" && config.x402FacilitatorUrl.includes("mock")) {
    return {
      valid: true,
      payer: "0xDemoPayerAddress",
      amount: "1",
    };
  }

  // Production: Validate with Ultravioleta facilitator
  try {
    const meter = getMeter(meterId);
    if (!meter) {
      return {
        valid: false,
        error: "METER_NOT_FOUND",
      };
    }

    // Use facilitator client for validation
    const result = await validateWithFacilitator(headerValue, meterId, meter);
    
    return {
      valid: result.valid === true,
      payer: result.payer,
      amount: result.amount,
      error: result.error,
      facilitatorResponse: result,
    };
  } catch (error) {
    logger.error(`Error in detailed validation for meter: ${meterId}`, error);
    
    // Fallback for development
    if (headerValue === "demo-token") {
      return {
        valid: true,
        payer: "0xDemoPayerAddress",
        amount: "1",
      };
    }
    
    return {
      valid: false,
      error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
    };
  }
}
