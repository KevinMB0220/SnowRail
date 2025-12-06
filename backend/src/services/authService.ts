import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";
import { config } from "../config/env.js";

const SALT_ROUNDS = 10;

/**
 * Hash a password using bcrypt
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 * @param password - Plain text password
 * @param hash - Hashed password
 * @returns True if password matches
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token for user
 * @param userId - User ID
 * @param companyId - Company ID
 * @returns JWT token
 */
export function generateToken(userId: string, companyId: string): string {
  const secret = config.jwtSecret;
  if (!secret || secret.trim() === "") {
    throw new Error("JWT_SECRET is not configured");
  }

  // Type narrowing: after the check, secret is guaranteed to be a non-empty string
  const jwtSecret: string = secret;

  const payload = {
    userId,
    companyId,
  };

  const expiresIn = (config.jwtExpiresIn || "7d") as string;
  
  return jwt.sign(payload, jwtSecret, {
    expiresIn,
  } as SignOptions);
}

/**
 * Verify and decode JWT token
 * @param token - JWT token
 * @returns Decoded payload with userId and companyId, or null if invalid
 */
export function verifyToken(
  token: string,
): { userId: string; companyId: string } | null {
  const secret = config.jwtSecret;
  if (!secret || secret.trim() === "") {
    throw new Error("JWT_SECRET is not configured");
  }

  try {
    const decoded = jwt.verify(token, secret) as {
      userId: string;
      companyId: string;
    };
    return decoded;
  } catch (error) {
    return null;
  }
}

