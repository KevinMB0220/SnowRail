import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Centralized environment configuration for SnowRail on top of x402 starter
export const config = {
  // HTTP server port
  port: parseInt(process.env.PORT || "4000", 10),

  // Database
  databaseUrl: process.env.DATABASE_URL || "file:./dev.db",

  // Network selection (avalanche | avalanche-fuji | fuji | polygon | others in the future)
  // Map "fuji" to "avalanche-fuji" for compatibility
  network: (() => {
    const net = process.env.NETWORK || "avalanche";
    return net === "fuji" ? "avalanche-fuji" : net;
  })(),

  // RPC URLs per network
  rpcUrls: {
    avalanche:
      process.env.RPC_URL_AVALANCHE ||
      "https://api.avax.network/ext/bc/C/rpc",
    "avalanche-fuji":
      process.env.RPC_URL_AVALANCHE ||
      "https://api.avax-test.network/ext/bc/C/rpc",
    polygon: process.env.RPC_URL_POLYGON || "https://polygon-rpc.com",
  },

  // Treasury contract configuration
  treasuryContractAddress: process.env.TREASURY_CONTRACT_ADDRESS || "",
  privateKey: process.env.PRIVATE_KEY || "",

  // x402 facilitator URL
  // If not set, defaults to integrated facilitator on same server
  x402FacilitatorUrl:
    process.env.X402_FACILITATOR_URL ||
    (process.env.PORT
      ? `http://localhost:${process.env.PORT}/facilitator`
      : "http://localhost:4000/facilitator"),

  // Rail API (mock in this MVP)
  railApiBaseUrl: process.env.RAIL_API_BASE_URL || "https://rail.mock",
  railApiKey: process.env.RAIL_API_KEY || "rail-mock-key",
} as const;

export type Config = typeof config;


