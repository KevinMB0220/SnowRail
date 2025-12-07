import type { Express, Request, Response } from "express";
import { x402Protect, type X402Request } from "../x402/middleware.js";
import { executePayrollDemo, getPayrollById } from "../services/payrollService.js";

const METER_ID = "payroll_execute";

export function registerPayrollRoutes(app: Express) {
  // POST /api/payroll/execute (protected by x402 header X-PAYMENT)
  app.post(
    "/api/payroll/execute",
    x402Protect(METER_ID),
    async (req: X402Request, res: Response) => {
      try {
        const payroll = await executePayrollDemo();
        if (!payroll) {
          return res.status(500).json({
            error: "EXECUTION_FAILED",
            message: "Failed to execute payroll",
          });
        }

        type PaymentItem = {
          id: string;
          amount: number;
          currency: string;
          status: string;
          recipient: string | null;
        };
        
        return res.status(200).json({
          success: true,
          payrollId: payroll.id,
          status: payroll.status,
          total: payroll.total,
          currency: payroll.currency,
          paymentsCount: payroll.payments.length,
          payments: payroll.payments.map((p: PaymentItem) => ({
            id: p.id,
            amount: p.amount,
            currency: p.currency,
            status: p.status,
            recipient: p.recipient,
          })),
          createdAt: payroll.createdAt.toISOString(),
        });
      } catch (err) {
        console.error("Failed to execute payroll", err);
        return res.status(500).json({
          error: "INTERNAL_ERROR",
          message: "Unexpected error executing payroll",
        });
      }
    },
  );

  // GET /api/payroll/:id
  app.get(
    "/api/payroll/:id",
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const payroll = await getPayrollById(id);
        if (!payroll) {
          return res.status(404).json({
            error: "NOT_FOUND",
            message: `Payroll not found: ${id}`,
          });
        }

        type PaymentDetail = {
          id: string;
          amount: number;
          currency: string;
          status: string;
          recipient: string | null;
          createdAt: Date;
          updatedAt: Date;
        };
        
        return res.status(200).json({
          id: payroll.id,
          total: payroll.total,
          currency: payroll.currency,
          status: payroll.status,
          createdAt: payroll.createdAt.toISOString(),
          updatedAt: payroll.updatedAt.toISOString(),
          payments: payroll.payments.map((p: PaymentDetail) => ({
            id: p.id,
            amount: p.amount,
            currency: p.currency,
            status: p.status,
            recipient: p.recipient,
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString(),
          })),
        });
      } catch (err) {
        console.error("Failed to fetch payroll", err);
        return res.status(500).json({
          error: "INTERNAL_ERROR",
          message: "Unexpected error fetching payroll",
        });
      }
    },
  );
}


