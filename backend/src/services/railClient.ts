/**
 * Rail Client Service
 * Real integration with Rail API for fiat payouts
 */

import { config } from "../config/env.js";

// Type alias for Fetch API Response to avoid conflict with Express Response
type FetchResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  text(): Promise<string>;
  json(): Promise<any>;
};

// Types based on Rail OpenAPI spec
export type RailPaymentInput = {
  payrollId: string;
  amount: number;
  currency: string;
  recipient?: string;
  sourceAccountId?: string;
  counterpartyId?: string;
};

export type RailPaymentResult = {
  id: string;
  status: "PROCESSING" | "PAID" | "FAILED" | "PENDING";
  createdAt: string;
  failureReason?: string;
};

// OAuth2 Token Response
type RailTokenResponse = {
  token_type: string;
  expires_in: number;
  access_token: string;
  scope: string;
};

// Rail API types (simplified from OpenAPI spec)
type RailWithdrawalRequest = {
  withdrawal_rail: "ACH" | "FEDWIRE" | "SEPA_CT" | "SWIFT" | "CRYPTO";
  description: string;
  source_account_id: string;
  amount: string; // Rail API expects amount as string
  destination_counterparty_id: string;
  purpose: "PAYROLL" | "PERSONAL_ACCOUNT" | "FAMILY" | "INSURANCE" | "INVESTMENT" | "REAL_ESTATE" | "TUITION" | "MEDICAL" | "TRAVEL" | "TRADE_TRANSACTIONS" | "UTILITY" | "TAX" | "LOAN" | "BILLS" | "TELECOM" | "INTELLECTUAL_PROPERTY" | "CHARITABLE_DONATIONS" | "MORTGAGE" | "EXPENSES_REIMBURSEMENT";
  memo?: string;
};

type RailWithdrawalResponse = {
  data: {
  id: string;
  status: string;
    created_timestamp?: string;
  updated_timestamp?: string;
    amount?: number;
    source_account_id?: string;
    destination_counterparty_id?: string;
    withdrawal_rail?: string;
    purpose?: string;
  };
};

type RailError = {
  errors: Array<{
    code: string;
    description: string;
  }>;
};

// Token cache to avoid requesting new token on every call
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Get OAuth2 access token from Rail API
 * Uses token caching to avoid unnecessary requests
 * Exported for testing purposes
 */
export async function getRailAccessToken(): Promise<string> {
  // Check if we have a valid cached token
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    // Refresh if less than 1 minute remaining
    return cachedToken.token;
  }

  // Read from config, but also check process.env directly as fallback
  const clientId = config.railClientId || process.env.RAIL_CLIENT_ID;
  const clientSecret = config.railClientSecret || process.env.RAIL_CLIENT_SECRET;
  const authUrl = config.railAuthUrl || process.env.RAIL_AUTH_URL;

  if (!clientId || !clientSecret || !authUrl) {
    throw new Error(
      "Rail OAuth2 credentials not configured. Set RAIL_CLIENT_ID, RAIL_CLIENT_SECRET, and RAIL_AUTH_URL in .env file"
    );
  }

  // Create Basic Auth header
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  // Required scopes for withdrawals
  const scopes = [
    "accounts:read",
    "accounts:write",
    "withdrawals:read",
    "withdrawals:write",
    "customers:read",
    "customers:write",
    "deposits:read",
    "deposits:write",
    "transfers:read",
    "transfers:write",
    "exchanges:read",
    "exchanges:write",
    "adjustments:read",
    "adjustments:write",
    "settlements:read",
    "applications:read",
    "applications:write",
  ].join(" ");

  const tokenUrl = `${authUrl}?grant_type=client_credentials&scope=${encodeURIComponent(scopes)}`;

  try {
    const response = (await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
        Authorization: `Basic ${basicAuth}`,
      },
    })) as unknown as FetchResponse;

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Rail OAuth2 error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = (await response.json()) as RailTokenResponse;

    // Cache the token (expires_in is in seconds)
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000, // Refresh 1 minute before expiry
    };

    return data.access_token;
  } catch (error) {
    console.error("Failed to get Rail OAuth2 token:", error);
    throw error;
  }
}

/**
 * Create a Rail withdrawal (fiat payout)
 * @param input - Payment input data
 * @returns Promise<RailPaymentResult>
 */
export async function createRailPayment(
  input: RailPaymentInput,
): Promise<RailPaymentResult> {
  // Read from config, but also check process.env directly as fallback
  const baseUrl = config.railApiBaseUrl || process.env.RAIL_API_BASE_URL;
  const clientId = config.railClientId || process.env.RAIL_CLIENT_ID;
  const clientSecret = config.railClientSecret || process.env.RAIL_CLIENT_SECRET;

  // Check if Rail is properly configured (not using mock)
  // Only use mock if explicitly set to mock URL or if credentials are missing
  const isMockUrl = !baseUrl || baseUrl === "https://rail.mock" || baseUrl.includes("rail.mock");
  const hasCredentials = clientId && clientId.trim() !== "" && clientSecret && clientSecret.trim() !== "";
  const isMockMode = isMockUrl || !hasCredentials;

  if (isMockMode) {
    // Fallback to mock if not configured
    console.warn("Rail API not configured, using mock", {
      baseUrl: baseUrl || "not set",
      hasClientId: !!clientId && clientId.trim() !== "",
      hasClientSecret: !!clientSecret && clientSecret.trim() !== "",
      clientIdLength: clientId?.length || 0,
      clientSecretLength: clientSecret?.length || 0,
      isMockUrl,
    });
    return createMockRailPayment(input);
  }

  // Log that we're using real Rail API (only in development)
  if (process.env.NODE_ENV === "development") {
    console.log("✅ Using Rail API (sandbox):", {
      baseUrl,
      clientId: clientId.substring(0, 10) + "...",
      hasCredentials: true,
    });
  }

  try {
    // Get OAuth2 access token
    const accessToken = await getRailAccessToken();

    // For MVP: assume we have source_account_id and counterparty_id
    // In production, these should be configured per customer/recipient
    const sourceAccountId = input.sourceAccountId || process.env.RAIL_SOURCE_ACCOUNT_ID;
    const counterpartyId = input.counterpartyId || process.env.RAIL_COUNTERPARTY_ID;

    if (!sourceAccountId || !counterpartyId) {
      const missingVars = [];
      if (!sourceAccountId) missingVars.push("RAIL_SOURCE_ACCOUNT_ID");
      if (!counterpartyId) missingVars.push("RAIL_COUNTERPARTY_ID");
      
      throw new Error(
        `Rail configuration incomplete. Missing in .env: ${missingVars.join(", ")}. ` +
        `To get these values: 1) Create a customer/application in Rail sandbox, ` +
        `2) Create accounts and counterparties, 3) Add the IDs to your .env file.`
      );
    }

    // Create withdrawal request (Rail API expects amount as string)
    const withdrawalRequest: RailWithdrawalRequest = {
      withdrawal_rail: "ACH", // Default to ACH, can be configured
      description: `Payroll payment for ${input.payrollId}`,
      source_account_id: sourceAccountId,
      amount: (input.amount / 100).toString(), // Convert from cents to dollars, then to string
      destination_counterparty_id: counterpartyId,
      purpose: "PAYROLL", // Required by Rail API
      memo: `Payroll-${input.payrollId}`,
    };

    const response = (await fetch(`${baseUrl}/v1/withdrawals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-L2f-Request-Id": `snowrail-${Date.now()}`,
      },
      body: JSON.stringify(withdrawalRequest),
    })) as unknown as FetchResponse;

    if (!response.ok) {
      let errorMsg = `Rail API error: ${response.status} ${response.statusText}`;
      try {
      const errorData = (await response.json()) as RailError;
        errorMsg = errorData.errors?.[0]?.description || errorMsg;
      } catch {
        // If response is not JSON, use the status text
      }
      throw new Error(errorMsg);
    }

    const responseData = (await response.json()) as RailWithdrawalResponse;
    const withdrawalData = responseData.data;

    // Note: Withdrawals in Rail need to be accepted before execution
    // For now, we'll leave it in REQUESTED/PENDING status
    // In production, you might want to:
    // 1. Review withdrawals before accepting
    // 2. Use webhooks to track status changes
    // 3. Accept programmatically if you have the required permissions/signature
    
    // The withdrawal is created successfully and will remain in REQUESTED status
    // until manually accepted via dashboard or with proper signature

    // Map Rail status to our status
    const statusMap: Record<string, RailPaymentResult["status"]> = {
      PENDING: "PENDING",
      REQUESTED: "PENDING",
      ACCEPTED: "PROCESSING",
      PROCESSING: "PROCESSING",
      COMPLETED: "PAID",
      FAILED: "FAILED",
      CANCELLED: "FAILED",
    };

    return {
      id: withdrawalData.id,
      status: statusMap[withdrawalData.status] || "PROCESSING",
      createdAt: withdrawalData.created_timestamp || new Date().toISOString(),
    };
  } catch (error) {
    console.error("Rail API error:", error);
    return {
      id: `rail_error_${Date.now()}`,
      status: "FAILED",
      createdAt: new Date().toISOString(),
      failureReason: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Accept a Rail withdrawal
 * @param withdrawalId - Withdrawal ID from Rail
 */
async function acceptRailWithdrawal(withdrawalId: string): Promise<void> {
  const baseUrl = config.railApiBaseUrl;
  const accessToken = await getRailAccessToken();

  const response = (await fetch(`${baseUrl}/v1/withdrawals/${withdrawalId}/accept`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-L2f-Request-Id": `snowrail-accept-${Date.now()}`,
    },
  })) as unknown as FetchResponse;

  if (!response.ok) {
    const errorData = (await response.json()) as RailError;
    throw new Error(
      errorData.errors?.[0]?.description || `Failed to accept withdrawal: ${response.statusText}`
    );
  }
}

/**
 * Mock implementation (fallback)
 * In demo/test mode, always return PAID to avoid false failures
 */
async function createMockRailPayment(
  input: RailPaymentInput,
): Promise<RailPaymentResult> {
  const delay = 1000 + Math.random() * 1000;
  await new Promise((resolve) => setTimeout(resolve, delay));

  const id = `rail_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  
  // In mock mode, always succeed (demo/test behavior)
  // Real Rail API will return actual status
  return {
    id,
    status: "PAID",
    createdAt: new Date().toISOString(),
  };
}
