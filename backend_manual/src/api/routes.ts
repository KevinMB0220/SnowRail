import { Router, Express } from "express";
import { executePayroll, getPayroll } from "./payroll.controller";
import { x402Protect } from "../x402/middleware";

/**
 * API Routes
 * Registers all API endpoints
 */

const router = Router();

// Payroll routes
// POST /api/payroll/execute - Protected by x402
router.post("/payroll/execute", x402Protect("payroll_execute"), executePayroll);

// GET /api/payroll/:id - Public (read-only)
router.get("/payroll/:id", getPayroll);

// Health check
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

/**
 * Register all routes on the Express app
 * @param app - Express application
 */
export function registerRoutes(app: Express): void {
  app.use("/api", router);
}

export { router };

