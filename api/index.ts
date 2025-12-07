/**
 * Vercel Serverless Function Handler
 * This file serves as the entry point for all backend API routes
 * It imports the Express app from the backend directory
 * 
 * Note: Vercel will compile TypeScript automatically, so we import from .ts files
 */

// Import the Express app from backend (Vercel will handle TypeScript compilation)
import app from "../backend/src/server.js";

export default app;
