/**
 * Minimal test server for agent + facilitator integration test
 * Only includes the endpoints needed for testing
 */

import express, { Express, Request, Response } from "express";
import { registerPayrollRoutes } from "../../src/api/payrollRoutes.js";

const app = express();
app.use(express.json());

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Register payroll routes (includes x402 protection)
registerPayrollRoutes(app);

// Facilitator health check endpoint
app.get("/api/facilitator/health", async (req: Request, res: Response) => {
  try {
    const facilitatorUrl = process.env.X402_FACILITATOR_URL || "http://localhost:4000/facilitator";
    const response = await fetch(`${facilitatorUrl}/health`);
    const data = await response.json();
    res.status(response.ok ? 200 : 503).json({
      healthy: response.ok,
      url: facilitatorUrl,
      ...data,
    });
  } catch (error) {
    res.status(503).json({
      healthy: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`✅ Test server running on http://localhost:${PORT}`);
  console.log(`📋 Health: http://localhost:${PORT}/api/health`);
  console.log(`💰 Payroll: POST http://localhost:${PORT}/api/payroll/execute`);
});

