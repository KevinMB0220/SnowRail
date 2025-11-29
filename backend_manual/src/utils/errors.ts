/**
 * Custom Error Classes
 * Provides typed errors for better error handling
 */

// Base application error
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// 400 Bad Request
export class BadRequestError extends AppError {
  constructor(message = "Bad Request", code = "BAD_REQUEST") {
    super(message, 400, code);
  }
}

// 401 Unauthorized
export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized", code = "UNAUTHORIZED") {
    super(message, 401, code);
  }
}

// 402 Payment Required
export class PaymentRequiredError extends AppError {
  public readonly metering?: Record<string, unknown>;

  constructor(
    message = "Payment Required",
    code = "PAYMENT_REQUIRED",
    metering?: Record<string, unknown>
  ) {
    super(message, 402, code);
    this.metering = metering;
  }
}

// 404 Not Found
export class NotFoundError extends AppError {
  constructor(message = "Not Found", code = "NOT_FOUND") {
    super(message, 404, code);
  }
}

// 500 Internal Server Error
export class InternalError extends AppError {
  constructor(message = "Internal Server Error", code = "INTERNAL_ERROR") {
    super(message, 500, code);
  }
}

// Error response formatter
export function formatErrorResponse(error: unknown): {
  error: string;
  message: string;
  statusCode: number;
} {
  if (error instanceof AppError) {
    return {
      error: error.code,
      message: error.message,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof Error) {
    return {
      error: "INTERNAL_ERROR",
      message: error.message,
      statusCode: 500,
    };
  }

  return {
    error: "UNKNOWN_ERROR",
    message: "An unknown error occurred",
    statusCode: 500,
  };
}

