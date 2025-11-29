import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./api/routes";
import { logger } from "./utils/logger";
import { formatErrorResponse, AppError } from "./utils/errors";

/**
 * Create and configure Express application
 */
export function createApp(): Express {
  const app = express();

  // Middleware: JSON parsing
  app.use(express.json());

  // Middleware: CORS
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || "*",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-PAYMENT"],
    })
  );

  // Middleware: Request logging
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      logger.debug(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
    });
    next();
  });

  // Register API routes
  registerRoutes(app);

  // Root endpoint
  app.get("/", (req: Request, res: Response) => {
    res.json({
      name: "SnowRail API",
      version: "1.0.0",
      description: "Payroll system with x402 protocol on Avalanche",
      endpoints: {
        health: "GET /api/health",
        executePayroll: "POST /api/payroll/execute (requires X-PAYMENT header)",
        getPayroll: "GET /api/payroll/:id",
      },
    });
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: "NOT_FOUND",
      message: `Route not found: ${req.method} ${req.path}`,
    });
  });

  // Global error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error("Unhandled error", err);
    const errorResponse = formatErrorResponse(err);
    res.status(errorResponse.statusCode).json(errorResponse);
  });

  return app;
}

