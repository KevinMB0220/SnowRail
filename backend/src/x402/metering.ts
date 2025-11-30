/**
 * 8004 Protocol - Metering Configuration
 * Defines resources, prices, and usage metering for x402 payments
 */

export type MeterConfig = {
  price: string;        // Price in asset units (e.g., "1" = 1 USDC)
  asset: string;        // Asset symbol (e.g., "USDC")
  chain: string;        // Blockchain network (e.g., "avalanche")
  resource: string;     // Logical resource name
  description?: string; // Human-readable description
  version: string;      // Protocol version
};

// Defined meters for SnowRail resources
// NOTE: All configured for Fuji testnet
export const meters: Record<string, MeterConfig> = {
  payroll_execute: {
    price: "1",
    asset: "USDC",
    chain: "fuji", // Fuji testnet
    resource: "payroll_execution",
    description: "Execute international payroll for up to 10 freelancers",
    version: "8004-alpha",
  },
  payment_single: {
    price: "0.1",
    asset: "USDC",
    chain: "fuji", // Fuji testnet
    resource: "single_payment",
    description: "Execute a single payment to one recipient",
    version: "8004-alpha",
  },
  swap_execute: {
    price: "0.5",
    asset: "USDC",
    chain: "fuji", // Fuji testnet
    resource: "token_swap",
    description: "Execute a token swap through DEX",
    version: "8004-alpha",
  },
  contract_test: {
    price: "0.1",
    asset: "USDC",
    chain: "fuji", // Fuji testnet
    resource: "contract_test",
    description: "Test Treasury contract operations (requestPayment, getTokenBalance, authorizeSwap, etc.)",
    version: "8004-alpha",
  },
};

// Get meter by ID
export function getMeter(meterId: string): MeterConfig | undefined {
  return meters[meterId];
}

// Validate meter exists
export function meterExists(meterId: string): boolean {
  return meterId in meters;
}
