/**
 * API Client for SnowRail Backend
 */

const API_BASE = "/api";

// Types for API responses
export type MeteringInfo = {
  price: string;
  asset: string;
  chain: string;
  resource: string;
  description?: string;
  version: string;
};

export type PayrollResponse = {
  success: boolean;
  payrollId: string;
  status: string;
  total: number;
  currency: string;
  paymentsCount: number;
  payments: PaymentResponse[];
  createdAt: string;
};

export type PaymentResponse = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  recipient: string | null;
};

export type PayrollDetailResponse = {
  id: string;
  total: number;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  payments: PaymentResponse[];
};

export type ApiError = {
  error: string;
  meterId?: string;
  metering?: MeteringInfo;
  message?: string;
};

/**
 * Execute payroll - may return 402 if payment required
 * @param paymentToken - Optional X-PAYMENT header value
 */
export async function executePayroll(paymentToken?: string): Promise<{
  success: true;
  data: PayrollResponse;
} | {
  success: false;
  status: number;
  error: ApiError;
}> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (paymentToken) {
    headers["X-PAYMENT"] = paymentToken;
  }

  const response = await fetch(`${API_BASE}/payroll/execute`, {
    method: "POST",
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      status: response.status,
      error: data as ApiError,
    };
  }

  return {
    success: true,
    data: data as PayrollResponse,
  };
}

/**
 * Get payroll details by ID
 * @param id - Payroll ID
 */
export async function getPayroll(id: string): Promise<{
  success: true;
  data: PayrollDetailResponse;
} | {
  success: false;
  error: ApiError;
}> {
  const response = await fetch(`${API_BASE}/payroll/${id}`);
  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: data as ApiError,
    };
  }

  return {
    success: true,
    data: data as PayrollDetailResponse,
  };
}

/**
 * Check API health
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Facilitator API types
 */
export type FacilitatorValidationRequest = {
  proof: string;
  meterId: string;
  price?: string;
  asset?: string;
  chain?: string;
};

export type FacilitatorValidationResponse = {
  valid: boolean;
  payer?: string;
  amount?: string;
  error?: string;
  message?: string;
};

/**
 * Get payment proof from facilitator
 * In production, this would create a real EIP-3009 signed authorization
 * For testnet, we use demo-token
 */
export async function getPaymentProofFromFacilitator(
  facilitatorUrl: string,
  metering: MeteringInfo,
  meterId: string
): Promise<string> {
  try {
    // Create a payment proof (simplified for testnet)
    // In production, this would be a signed EIP-3009 authorization
    const paymentProof = {
      from: "0x22f6F000609d52A0b0efCD4349222cd9d70716Ba", // Agent wallet
      to: "0xPayToAddress", // Backend payment address
      value: metering.price,
      validAfter: Math.floor(Date.now() / 1000),
      validBefore: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      nonce: `0x${Math.random().toString(16).substring(2, 18)}`,
      signature: "0x" + "0".repeat(130), // Simplified signature for testnet
    };

    // Validate proof with facilitator
    const validateResponse = await fetch(`${facilitatorUrl}/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        proof: JSON.stringify(paymentProof),
        meterId,
        price: metering.price,
        asset: metering.asset,
        chain: metering.chain,
      }),
    });

    if (validateResponse.ok) {
      const validation: FacilitatorValidationResponse = await validateResponse.json();
      if (validation.valid) {
        return JSON.stringify(paymentProof);
      }
    }

    // For testnet, facilitator accepts demo-token
    return "demo-token";
  } catch (error) {
    // Fallback to demo-token for testnet
    console.warn("Facilitator validation failed, using demo-token:", error);
    return "demo-token";
  }
}

/**
 * Check facilitator health
 */
export async function checkFacilitatorHealth(
  facilitatorUrl: string
): Promise<boolean> {
  try {
    const response = await fetch(`${facilitatorUrl}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Test contract operations
 * @param paymentToken - Optional X-PAYMENT header value (e.g., "demo-token")
 */
export async function testContract(paymentToken?: string): Promise<{
  success: true;
  data: {
    success: boolean;
    results: Array<{
      step: string;
      success: boolean;
      transactionHash?: string;
      blockNumber?: number;
      gasUsed?: string;
      error?: string;
      data?: any;
      balance?: string;
      formatted?: string;
      allowance?: string;
    }>;
    transactionHashes: string[];
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
  };
} | {
  success: false;
  status: number;
  error: ApiError;
}> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (paymentToken) {
    headers["X-PAYMENT"] = paymentToken;
  }

  const response = await fetch(`${API_BASE}/treasury/test`, {
    method: "POST",
    headers,
  });

  // Check if response is JSON before parsing
  const contentType = response.headers.get("content-type");
  let data: any;
  
  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    // If not JSON, read as text to see what we got
    const text = await response.text();
    console.error("Non-JSON response:", text.substring(0, 200));
    return {
      success: false,
      status: response.status,
      error: {
        error: "INVALID_RESPONSE",
        message: `Server returned non-JSON response: ${response.status} ${response.statusText}`,
      } as ApiError,
    };
  }

  if (!response.ok) {
    return {
      success: false,
      status: response.status,
      error: data as ApiError,
    };
  }

  return {
    success: true,
    data: data as {
      success: boolean;
      results: Array<any>;
      transactionHashes: string[];
      summary: {
        total: number;
        successful: number;
        failed: number;
      };
    },
  };
}

