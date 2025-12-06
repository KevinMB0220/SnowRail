/**
 * Price Feed Service
 * Converts token amounts to USD using CoinGecko API
 * Includes caching to reduce API calls
 */

import { logger } from "../utils/logger.js";
import { config } from "../config/env.js";

// Cache structure
interface PriceCache {
  price: number;
  timestamp: number;
}

// Cache duration: 5 minutes
const CACHE_DURATION_MS = 5 * 60 * 1000;

// In-memory cache
const priceCache: Map<string, PriceCache> = new Map();

// Token mapping to CoinGecko IDs
const TOKEN_MAP: Record<string, string> = {
  USDC: "usd-coin",
  "xUSDC": "usd-coin",
  USDT: "tether",
  "xUSDT": "tether",
};

/**
 * Get USD price for a token
 * @param token - Token symbol (e.g., "xUSDC", "USDC", "USDT")
 * @returns Price in USD
 */
export async function getTokenPrice(token: string): Promise<number> {
  // Check cache first
  const cached = priceCache.get(token.toUpperCase());
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_DURATION_MS) {
    logger.debug(`Using cached price for ${token}: $${cached.price}`);
    return cached.price;
  }

  // For USDC/USDT on testnet, use fixed price of 1.0
  const normalizedToken = token.toUpperCase();
  if (normalizedToken === "USDC" || normalizedToken === "XUSDC" || normalizedToken === "USDT" || normalizedToken === "XUSDT") {
    const fixedPrice = 1.0;
    priceCache.set(normalizedToken, { price: fixedPrice, timestamp: now });
    logger.debug(`Using fixed price for ${token} (testnet): $${fixedPrice}`);
    return fixedPrice;
  }

  // Try to fetch from CoinGecko
  try {
    const coinGeckoId = TOKEN_MAP[normalizedToken];
    if (!coinGeckoId) {
      logger.warn(`Unknown token ${token}, defaulting to $1.0`);
      return 1.0;
    }

    const apiKey = process.env.COINGECKO_API_KEY;
    const url = apiKey
      ? `https://pro-api.coingecko.com/api/v3/simple/price?ids=${coinGeckoId}&vs_currencies=usd&x_cg_pro_api_key=${apiKey}`
      : `https://api.coingecko.com/api/v3/simple/price?ids=${coinGeckoId}&vs_currencies=usd`;

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = (await response.json()) as Record<string, { usd?: number }>;
    const price = data[coinGeckoId]?.usd;

    if (!price || typeof price !== "number") {
      throw new Error(`Invalid price data from CoinGecko`);
    }

    // Update cache
    priceCache.set(normalizedToken, { price, timestamp: now });
    logger.info(`Fetched price for ${token}: $${price}`);

    return price;
  } catch (error) {
    logger.error(`Failed to fetch price for ${token}:`, error);

    // Fallback to cached price if available (even if expired)
    if (cached) {
      logger.warn(`Using expired cached price for ${token}: $${cached.price}`);
      return cached.price;
    }

    // Final fallback: 1.0 for stablecoins, 0 for unknown
    const fallbackPrice = normalizedToken.includes("USD") ? 1.0 : 0;
    logger.warn(`Using fallback price for ${token}: $${fallbackPrice}`);
    return fallbackPrice;
  }
}

/**
 * Clear price cache (useful for testing)
 */
export function clearPriceCache(): void {
  priceCache.clear();
}

/**
 * Get cached price without fetching (returns undefined if not cached)
 */
export function getCachedPrice(token: string): number | undefined {
  const cached = priceCache.get(token.toUpperCase());
  return cached?.price;
}

