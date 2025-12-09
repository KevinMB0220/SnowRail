import { Router, Request, Response } from "express";
import { prisma } from "../dbClient.js";
import { getAgentIdentity } from "../x402/agentIdentity.js";
import { logger } from "../utils/logger.js";

const router = Router();

/**
 * GET /api/agent/identity
 * Returns ERC-8004 compliant agent identity card
 */
router.get("/identity", (req: Request, res: Response) => {
  logger.info("🤖 Agent identity card requested");
  const identity = getAgentIdentity();
  res.json(identity);
});

/**
 * GET /api/agent/activity
 * Returns recent payroll activity with Arweave receipts
 */
router.get("/activity", async (req: Request, res: Response) => {
  try {
    logger.info("📊 Agent activity requested");

    // Get payrolls with payments (include all statuses except PENDING)
    // Show PAID, RAIL_PROCESSING, ONCHAIN_PAID, and FAILED payrolls
    const payrolls = await prisma.payroll.findMany({
      where: {
        status: {
          not: "PENDING" // Exclude only PENDING, show all others
        }
      },
      include: {
        payments: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 20 // Últimos 20 payrolls
    });

    // Transform to activity format
    type PayrollWithPayments = {
      id: string;
      status: string;
      total: number;
      currency: string;
      payments: Array<{ id: string; amount: number; recipient: string | null; status: string }>;
      createdAt: Date;
      updatedAt: Date;
    };
    
    const activity = payrolls.map((payroll: PayrollWithPayments) => {
      // Generate Arweave URL (en producción esto vendría de la DB)
      const mockTxId = Buffer.from(payroll.id).toString('base64url').padEnd(43, 'a').substring(0, 43);
      
      return {
        id: payroll.id,
        type: "payroll_execution",
        status: payroll.status,
        totalAmount: payroll.total,
        currency: payroll.currency,
        recipientCount: payroll.payments.length,
        createdAt: payroll.createdAt.toISOString(),
        updatedAt: payroll.updatedAt.toISOString(),
        // Arweave receipt
        arweave: {
          txId: mockTxId,
          url: `https://arweave.net/${mockTxId}`,
          receipt: {
            payrollId: payroll.id,
            status: payroll.status,
            totalAmount: payroll.total.toString(),
            currency: payroll.currency,
            recipientCount: payroll.payments.length,
            network: "fuji",
            protocol: "snowrail-payroll-v1",
            agentId: "snowrail-treasury-v1",
            x402MeterId: "payroll_execute"
          }
        },
        // Payment details
        payments: payroll.payments.map((payment: { id: string; amount: number; recipient: string | null; status: string }) => ({
          id: payment.id,
          amount: payment.amount,
          recipient: payment.recipient,
          status: payment.status
        }))
      };
    });

    // Summary stats
    const stats = {
      totalPayrolls: payrolls.length,
      totalPaid: payrolls.reduce((sum: number, p: PayrollWithPayments) => sum + p.total, 0),
      totalRecipients: payrolls.reduce((sum: number, p: PayrollWithPayments) => sum + p.payments.length, 0),
      lastActivity: payrolls[0]?.createdAt.toISOString() || null
    };

    res.json({
      stats,
      activity,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error("Error fetching agent activity", error);
    res.status(500).json({
      error: "Failed to fetch activity",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/agent/stats
 * Returns agent statistics
 */
router.get("/stats", async (req: Request, res: Response) => {
  try {
    logger.info("📈 Agent stats requested");

    // Count payrolls by status
    const payrollsByStatus = await prisma.payroll.groupBy({
      by: ["status"],
      _count: {
        id: true
      }
    });

    // Total amounts
    const totalPaid = await prisma.payroll.aggregate({
      where: { status: "PAID" },
      _sum: { total: true }
    });

    const totalProcessing = await prisma.payroll.aggregate({
      where: { 
        status: {
          in: ["PENDING", "ONCHAIN_PAID", "RAIL_PROCESSING"]
        }
      },
      _sum: { total: true }
    });

    // Recent activity
    const last24h = await prisma.payroll.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    });

    // Total recipients
    const totalRecipients = await prisma.payment.count();

    type PayrollByStatus = {
      status: string;
      _count: { id: number };
    };

    res.json({
      payrolls: {
        byStatus: payrollsByStatus.reduce((acc: Record<string, number>, item: PayrollByStatus) => ({
          ...acc,
          [item.status]: item._count.id
        }), {}),
        total: payrollsByStatus.reduce((sum: number, item: PayrollByStatus) => sum + item._count.id, 0),
        last24h
      },
      amounts: {
        totalPaid: totalPaid._sum.total || 0,
        totalProcessing: totalProcessing._sum.total || 0,
        currency: "USD"
      },
      recipients: {
        total: totalRecipients
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error("Error fetching agent stats", error);
    res.status(500).json({
      error: "Failed to fetch stats",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export function registerAgentRoutes(app: any) {
  app.use("/api/agent", router);
}

