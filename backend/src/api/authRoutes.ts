import type { Express, Request, Response } from "express";
import { prisma } from "../dbClient.js";
import { hashPassword, verifyPassword, generateToken } from "../services/authService.js";
import { authenticate, type AuthenticatedRequest } from "../middleware/authMiddleware.js";
import { logger } from "../utils/logger.js";

// Signup request type
type SignupRequest = {
  email: string;
  password: string;
  companyLegalName: string;
  country?: string;
};

// Login request type
type LoginRequest = {
  email: string;
  password: string;
};

/**
 * Register authentication routes
 */
export function registerAuthRoutes(app: Express) {
  /**
   * POST /auth/signup
   * Create a new user and company (KYB Level 0)
   */
  app.post("/auth/signup", async (req: Request, res: Response) => {
    try {
      const { email, password, companyLegalName, country = "US" }: SignupRequest =
        req.body;

      // Validate required fields
      if (!email || !password || !companyLegalName) {
        return res.status(400).json({
          error: "INVALID_REQUEST",
          message: "Email, password, and company legal name are required",
        });
      }

      // Validate email format (basic)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: "INVALID_EMAIL_FORMAT",
          message: "Invalid email format",
        });
      }

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(400).json({
          error: "EMAIL_EXISTS",
          message: "This email is already registered. Please use another email or sign in",
        });
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create company and user in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create company with default values
        const company = await tx.company.create({
          data: {
            legalName: companyLegalName,
            country,
            businessEmail: email,
            kybLevel: 0,
            kybStatus: "none",
            railStatus: "none",
          },
        });

        // Create user linked to company
        const user = await tx.user.create({
          data: {
            email,
            passwordHash,
            companyId: company.id,
          },
        });

        return { user, company };
      });

      // Generate JWT token
      const token = generateToken(result.user.id, result.company.id);

      logger.info(`User created: ${result.user.id}, Company: ${result.company.id}`);

      return res.status(201).json({
        token,
        user: {
          id: result.user.id,
          email: result.user.email,
          companyId: result.company.id,
        },
        company: {
          id: result.company.id,
          legalName: result.company.legalName,
          kybLevel: result.company.kybLevel,
          kybStatus: result.company.kybStatus,
          railStatus: result.company.railStatus,
        },
      });
    } catch (error) {
      logger.error("Signup error:", error);
      return res.status(500).json({
        error: "INTERNAL_ERROR",
        message: "Failed to create account. Please try again later",
      });
    }
  });

  /**
   * POST /auth/login
   * Authenticate user and return JWT token
   */
  app.post("/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password }: LoginRequest = req.body;

      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({
          error: "INVALID_REQUEST",
          message: "Email and password are required",
        });
      }

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
        include: { company: true },
      });

      if (!user) {
        return res.status(401).json({
          error: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        });
      }

      // Verify password
      const isValidPassword = await verifyPassword(password, user.passwordHash);

      if (!isValidPassword) {
        return res.status(401).json({
          error: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        });
      }

      // Generate JWT token
      const token = generateToken(user.id, user.companyId);

      logger.info(`User logged in: ${user.id}`);

      return res.status(200).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          companyId: user.companyId,
        },
        company: {
          id: user.company.id,
          legalName: user.company.legalName,
          kybLevel: user.company.kybLevel,
          kybStatus: user.company.kybStatus,
          railStatus: user.company.railStatus,
        },
      });
    } catch (error) {
      logger.error("Login error:", error);
      return res.status(500).json({
        error: "INTERNAL_ERROR",
        message: "Failed to authenticate. Please try again later",
      });
    }
  });

  /**
   * GET /auth/me
   * Get current authenticated user and company info
   */
  app.get(
    "/auth/me",
    authenticate,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.userId;
        const companyId = req.user?.companyId;

        if (!userId || !companyId) {
          return res.status(401).json({
            error: "UNAUTHORIZED",
            message: "Unauthorized - please log in again",
          });
        }

        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: { company: true },
        });

        if (!user) {
          return res.status(404).json({
            error: "NOT_FOUND",
            message: "User not found",
          });
        }

        return res.status(200).json({
          user: {
            id: user.id,
            email: user.email,
            companyId: user.companyId,
          },
          company: {
            id: user.company.id,
            legalName: user.company.legalName,
            tradeName: user.company.tradeName,
            country: user.company.country,
            kybLevel: user.company.kybLevel,
            kybStatus: user.company.kybStatus,
            railStatus: user.company.railStatus,
          },
        });
      } catch (error) {
        logger.error("Get me error:", error);
      return res.status(500).json({
        error: "INTERNAL_ERROR",
        message: "Failed to fetch user info",
      });
      }
    },
  );
}

