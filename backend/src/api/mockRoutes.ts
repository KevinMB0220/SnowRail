/**
 * Mock Routes for Testing
 * Allows simulation of KYB status changes and other testing features
 */

import type { Express, Response } from "express";
import { prisma } from "../dbClient.js";
import { authenticate, type AuthenticatedRequest } from "../middleware/authMiddleware.js";
import { logger } from "../utils/logger.js";

/**
 * Register mock routes for testing
 */
export function registerMockRoutes(app: Express) {
  /**
   * POST /api/mock/kyb/approve
   * Simulate KYB approval (sets kybLevel to 1 and kybStatus to "approved")
   * Protected endpoint - requires JWT authentication
   */
  app.post("/api/mock/kyb/approve", authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.user?.companyId;

      if (!companyId) {
        return res.status(401).json({
          error: "UNAUTHORIZED",
          message: "Company ID not found in token",
        });
      }

      const company = await prisma.company.update({
        where: { id: companyId },
        data: {
          kybLevel: 1,
          kybStatus: "approved",
          kybVerifiedAt: new Date(),
        },
      });

      logger.info(`Mock KYB approval for company ${companyId}`);

      return res.json({
        success: true,
        message: "KYB approval simulated successfully",
        company: {
          id: company.id,
          kybLevel: company.kybLevel,
          kybStatus: company.kybStatus,
        },
      });
    } catch (error) {
      logger.error("Error simulating KYB approval:", error);
      return res.status(500).json({
        error: "INTERNAL_ERROR",
        message: "Failed to simulate KYB approval",
      });
    }
  });
}
