import dotenv from "dotenv";

dotenv.config();

// Environment configuration with type safety
export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  databaseUrl: process.env.DATABASE_URL || "file:./dev.db",
  network: process.env.NETWORK || "avalanche",
  rpcUrls: {
    avalanche: process.env.RPC_URL_AVALANCHE || "https://api.avax.network/ext/bc/C/rpc",
    polygon: process.env.RPC_URL_POLYGON || "https://polygon-rpc.com",
  },
  treasuryContractAddress: process.env.TREASURY_CONTRACT_ADDRESS || "",
  privateKey: process.env.PRIVATE_KEY || "",
  x402FacilitatorUrl: process.env.X402_FACILITATOR_URL || "https://facilitator.mock",
  railApiBaseUrl: process.env.RAIL_API_BASE_URL || "https://rail.mock",
  railApiKey: process.env.RAIL_API_KEY || "rail-mock-key",
} as const;

export type Config = typeof config;

