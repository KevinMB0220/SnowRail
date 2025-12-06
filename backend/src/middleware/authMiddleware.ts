import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/authService.js";

// Extend Express Request to include user and company
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    companyId: string;
  };
  company?: {
    companyId: string;
  };
}

/**
 * Authentication middleware
 * Validates JWT token from Authorization header and adds user/company to request
 */
export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Unauthorized - please log in again",
    });
    return;
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix

  const decoded = verifyToken(token);

  if (!decoded) {
    res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Unauthorized - please log in again",
    });
    return;
  }

  // Add user and company info to request
  req.user = {
    userId: decoded.userId,
    companyId: decoded.companyId,
  };
  req.company = {
    companyId: decoded.companyId,
  };

  next();
}

